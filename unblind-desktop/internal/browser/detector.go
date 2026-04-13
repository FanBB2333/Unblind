package browser

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

// BrowserInfo contains information about a detected browser
type BrowserInfo struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Version string `json:"version"`
	IsValid bool   `json:"isValid"`
}

// Detector handles browser detection
type Detector struct {
	customPath string
}

// NewDetector creates a new browser detector
func NewDetector() *Detector {
	return &Detector{}
}

// SetCustomPath sets a custom browser path
func (d *Detector) SetCustomPath(path string) {
	d.customPath = path
}

// DetectBrowsers returns all detected browsers on the system
func (d *Detector) DetectBrowsers() []BrowserInfo {
	var browsers []BrowserInfo

	switch runtime.GOOS {
	case "darwin":
		browsers = d.detectMacOSBrowsers()
	case "windows":
		browsers = d.detectWindowsBrowsers()
	case "linux":
		browsers = d.detectLinuxBrowsers()
	}

	// Add custom path if set
	if d.customPath != "" {
		customBrowser := d.validateBrowser(d.customPath, "Custom")
		if customBrowser.IsValid {
			browsers = append([]BrowserInfo{customBrowser}, browsers...)
		}
	}

	return browsers
}

// GetBestBrowser returns the best available browser
func (d *Detector) GetBestBrowser() *BrowserInfo {
	browsers := d.DetectBrowsers()
	for _, b := range browsers {
		if b.IsValid {
			return &b
		}
	}
	return nil
}

func (d *Detector) detectMacOSBrowsers() []BrowserInfo {
	var browsers []BrowserInfo

	// Common Chrome/Chromium paths on macOS
	paths := []struct {
		name string
		path string
	}{
		{"Google Chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"},
		{"Google Chrome Canary", "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"},
		{"Chromium", "/Applications/Chromium.app/Contents/MacOS/Chromium"},
		{"Microsoft Edge", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"},
		{"Brave Browser", "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"},
	}

	for _, p := range paths {
		browser := d.validateBrowser(p.path, p.name)
		browsers = append(browsers, browser)
	}

	// Also check user's Applications folder
	homeDir, err := os.UserHomeDir()
	if err == nil {
		userPaths := []struct {
			name string
			path string
		}{
			{"Google Chrome (User)", filepath.Join(homeDir, "Applications/Google Chrome.app/Contents/MacOS/Google Chrome")},
			{"Chromium (User)", filepath.Join(homeDir, "Applications/Chromium.app/Contents/MacOS/Chromium")},
		}

		for _, p := range userPaths {
			browser := d.validateBrowser(p.path, p.name)
			if browser.IsValid {
				browsers = append(browsers, browser)
			}
		}
	}

	return browsers
}

func (d *Detector) detectWindowsBrowsers() []BrowserInfo {
	var browsers []BrowserInfo

	// Common paths on Windows
	localAppData := os.Getenv("LOCALAPPDATA")
	programFiles := os.Getenv("PROGRAMFILES")
	programFilesX86 := os.Getenv("PROGRAMFILES(X86)")

	paths := []struct {
		name string
		path string
	}{
		{"Google Chrome", filepath.Join(localAppData, "Google/Chrome/Application/chrome.exe")},
		{"Google Chrome", filepath.Join(programFiles, "Google/Chrome/Application/chrome.exe")},
		{"Google Chrome", filepath.Join(programFilesX86, "Google/Chrome/Application/chrome.exe")},
		{"Microsoft Edge", filepath.Join(programFilesX86, "Microsoft/Edge/Application/msedge.exe")},
		{"Microsoft Edge", filepath.Join(programFiles, "Microsoft/Edge/Application/msedge.exe")},
		{"Chromium", filepath.Join(localAppData, "Chromium/Application/chrome.exe")},
		{"Brave", filepath.Join(localAppData, "BraveSoftware/Brave-Browser/Application/brave.exe")},
	}

	for _, p := range paths {
		browser := d.validateBrowser(p.path, p.name)
		if browser.IsValid {
			browsers = append(browsers, browser)
		}
	}

	return browsers
}

func (d *Detector) detectLinuxBrowsers() []BrowserInfo {
	var browsers []BrowserInfo

	// Check PATH for common browser commands
	commands := []struct {
		name    string
		command string
	}{
		{"Google Chrome", "google-chrome"},
		{"Google Chrome", "google-chrome-stable"},
		{"Chromium", "chromium"},
		{"Chromium", "chromium-browser"},
		{"Microsoft Edge", "microsoft-edge"},
		{"Microsoft Edge", "microsoft-edge-stable"},
		{"Brave", "brave-browser"},
	}

	for _, c := range commands {
		path, err := exec.LookPath(c.command)
		if err == nil {
			browser := d.validateBrowser(path, c.name)
			if browser.IsValid {
				browsers = append(browsers, browser)
			}
		}
	}

	// Also check common installation paths
	paths := []struct {
		name string
		path string
	}{
		{"Google Chrome", "/usr/bin/google-chrome"},
		{"Google Chrome", "/usr/bin/google-chrome-stable"},
		{"Chromium", "/usr/bin/chromium"},
		{"Chromium", "/usr/bin/chromium-browser"},
		{"Chromium", "/snap/bin/chromium"},
	}

	for _, p := range paths {
		browser := d.validateBrowser(p.path, p.name)
		if browser.IsValid {
			// Check if not already added
			found := false
			for _, b := range browsers {
				if b.Path == browser.Path {
					found = true
					break
				}
			}
			if !found {
				browsers = append(browsers, browser)
			}
		}
	}

	return browsers
}

func (d *Detector) validateBrowser(path string, name string) BrowserInfo {
	info := BrowserInfo{
		Name:    name,
		Path:    path,
		IsValid: false,
	}

	// Check if file exists
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return info
	}

	// Try to get version
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin", "linux":
		cmd = exec.Command(path, "--version")
	case "windows":
		cmd = exec.Command(path, "--version")
	}

	if cmd != nil {
		output, err := cmd.Output()
		if err == nil {
			info.Version = string(output)
			info.IsValid = true
		} else {
			// Even if version check fails, the browser might still work
			info.IsValid = true
		}
	}

	return info
}
