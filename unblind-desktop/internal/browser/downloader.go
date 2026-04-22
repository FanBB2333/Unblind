package browser

import (
	"archive/zip"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
)

// DownloadProgress represents the download progress
type DownloadProgress struct {
	TotalBytes      int64   `json:"totalBytes"`
	DownloadedBytes int64   `json:"downloadedBytes"`
	Percentage      float64 `json:"percentage"`
	Status          string  `json:"status"` // "downloading", "extracting", "completed", "error"
	Error           string  `json:"error"`
}

// Downloader handles browser kernel downloads
type Downloader struct {
	dataDir    string
	progress   DownloadProgress
	mu         sync.RWMutex
	cancelFunc context.CancelFunc
	onProgress func(DownloadProgress)
}

// NewDownloader creates a new browser downloader
func NewDownloader(dataDir string) *Downloader {
	return &Downloader{
		dataDir: dataDir,
	}
}

// SetOnProgress sets the progress callback
func (d *Downloader) SetOnProgress(callback func(DownloadProgress)) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.onProgress = callback
}

// GetProgress returns the current download progress
func (d *Downloader) GetProgress() DownloadProgress {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return d.progress
}

// GetKernelPath returns the path to the downloaded kernel executable
func (d *Downloader) GetKernelPath() string {
	kernelDir := filepath.Join(d.dataDir, "chromium")

	switch runtime.GOOS {
	case "darwin":
		return filepath.Join(kernelDir, "Chromium.app", "Contents", "MacOS", "Chromium")
	case "windows":
		return filepath.Join(kernelDir, "chrome-win", "chrome.exe")
	case "linux":
		return filepath.Join(kernelDir, "chrome-linux", "chrome")
	}
	return ""
}

// IsKernelDownloaded checks if the kernel is already downloaded
func (d *Downloader) IsKernelDownloaded() bool {
	path := d.GetKernelPath()
	if path == "" {
		return false
	}
	_, err := os.Stat(path)
	return err == nil
}

// Download downloads the Chromium kernel
// Uses chromium snapshots from https://commondatastorage.googleapis.com/chromium-browser-snapshots
func (d *Downloader) Download(ctx context.Context) error {
	// Create cancellable context
	ctx, cancel := context.WithCancel(ctx)
	d.mu.Lock()
	d.cancelFunc = cancel
	d.mu.Unlock()

	defer func() {
		d.mu.Lock()
		d.cancelFunc = nil
		d.mu.Unlock()
	}()

	// Determine platform-specific download URL
	downloadURL, err := d.getDownloadURL()
	if err != nil {
		d.setError(err.Error())
		return err
	}

	// Create download directory
	kernelDir := filepath.Join(d.dataDir, "chromium")
	if err := os.MkdirAll(kernelDir, 0755); err != nil {
		d.setError(fmt.Sprintf("Failed to create directory: %v", err))
		return err
	}

	// Download the zip file
	zipPath := filepath.Join(kernelDir, "chromium.zip")
	if err := d.downloadFile(ctx, downloadURL, zipPath); err != nil {
		d.setError(fmt.Sprintf("Download failed: %v", err))
		return err
	}

	// Extract the zip file
	d.updateProgress(0, 0, "extracting")
	if err := d.extractZip(zipPath, kernelDir); err != nil {
		d.setError(fmt.Sprintf("Extraction failed: %v", err))
		return err
	}

	// Remove the zip file
	os.Remove(zipPath)

	// On macOS, strip the Gatekeeper quarantine attribute so the downloaded
	// binary is allowed to run without a "cannot be opened" security warning.
	if runtime.GOOS == "darwin" {
		exec.Command("xattr", "-cr", kernelDir).Run()
	}

	// Make the binary executable on Unix systems
	if runtime.GOOS != "windows" {
		execPath := d.GetKernelPath()
		if execPath != "" {
			os.Chmod(execPath, 0755)
		}
	}

	d.updateProgress(100, 100, "completed")
	return nil
}

// Cancel cancels the ongoing download
func (d *Downloader) Cancel() {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.cancelFunc != nil {
		d.cancelFunc()
	}
}

// Delete removes the downloaded kernel
func (d *Downloader) Delete() error {
	kernelDir := filepath.Join(d.dataDir, "chromium")
	return os.RemoveAll(kernelDir)
}

func (d *Downloader) getDownloadURL() (string, error) {
	// Using a stable Chromium snapshot
	// Note: In production, you might want to use a more reliable source
	// or implement proper version checking

	baseURL := "https://commondatastorage.googleapis.com/chromium-browser-snapshots"

	// Use a known stable snapshot revision
	// These are approximate - in production you'd want to fetch the latest stable
	switch runtime.GOOS {
	case "darwin":
		if runtime.GOARCH == "arm64" {
			return fmt.Sprintf("%s/Mac_Arm/1181205/chrome-mac.zip", baseURL), nil
		}
		return fmt.Sprintf("%s/Mac/1181205/chrome-mac.zip", baseURL), nil
	case "windows":
		if runtime.GOARCH == "amd64" {
			return fmt.Sprintf("%s/Win_x64/1181205/chrome-win.zip", baseURL), nil
		}
		return fmt.Sprintf("%s/Win/1181205/chrome-win32.zip", baseURL), nil
	case "linux":
		return fmt.Sprintf("%s/Linux_x64/1181205/chrome-linux.zip", baseURL), nil
	default:
		return "", fmt.Errorf("unsupported platform: %s/%s", runtime.GOOS, runtime.GOARCH)
	}
}

func (d *Downloader) downloadFile(ctx context.Context, url, destPath string) error {
	// Create HTTP request with context
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", resp.Status)
	}

	// Create destination file
	out, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer out.Close()

	// Get total size
	totalBytes := resp.ContentLength

	// Create progress reader
	reader := &progressReader{
		reader:     resp.Body,
		totalBytes: totalBytes,
		onProgress: func(downloaded int64) {
			percentage := float64(0)
			if totalBytes > 0 {
				percentage = float64(downloaded) / float64(totalBytes) * 100
			}
			d.updateProgress(downloaded, totalBytes, "downloading")
			_ = percentage
		},
	}

	// Copy with progress
	_, err = io.Copy(out, reader)
	return err
}

func (d *Downloader) extractZip(zipPath, destDir string) error {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return err
	}
	defer r.Close()

	for _, f := range r.File {
		// Clean the file path
		fpath := filepath.Join(destDir, f.Name)

		// Check for ZipSlip vulnerability
		if !strings.HasPrefix(fpath, filepath.Clean(destDir)+string(os.PathSeparator)) {
			return fmt.Errorf("invalid file path: %s", fpath)
		}

		if f.FileInfo().IsDir() {
			os.MkdirAll(fpath, os.ModePerm)
			continue
		}

		// Create parent directories
		if err := os.MkdirAll(filepath.Dir(fpath), os.ModePerm); err != nil {
			return err
		}

		// Extract file
		outFile, err := os.OpenFile(fpath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			outFile.Close()
			return err
		}

		_, err = io.Copy(outFile, rc)
		outFile.Close()
		rc.Close()

		if err != nil {
			return err
		}
	}

	return nil
}

func (d *Downloader) updateProgress(downloaded, total int64, status string) {
	d.mu.Lock()
	d.progress.DownloadedBytes = downloaded
	d.progress.TotalBytes = total
	if total > 0 {
		d.progress.Percentage = float64(downloaded) / float64(total) * 100
	}
	d.progress.Status = status
	d.progress.Error = ""
	callback := d.onProgress
	progress := d.progress
	d.mu.Unlock()

	if callback != nil {
		callback(progress)
	}
}

func (d *Downloader) setError(errMsg string) {
	d.mu.Lock()
	d.progress.Status = "error"
	d.progress.Error = errMsg
	callback := d.onProgress
	progress := d.progress
	d.mu.Unlock()

	if callback != nil {
		callback(progress)
	}
}

// progressReader wraps an io.Reader to report progress
type progressReader struct {
	reader     io.Reader
	totalBytes int64
	downloaded int64
	onProgress func(int64)
}

func (pr *progressReader) Read(p []byte) (int, error) {
	n, err := pr.reader.Read(p)
	pr.downloaded += int64(n)
	if pr.onProgress != nil {
		pr.onProgress(pr.downloaded)
	}
	return n, err
}
