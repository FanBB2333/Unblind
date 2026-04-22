package main

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"

	"unblind-desktop/internal/appstate"
	"unblind-desktop/internal/auth"
	"unblind-desktop/internal/browser"
	"unblind-desktop/internal/config"
	"unblind-desktop/internal/credentials"
	"unblind-desktop/internal/diagnostics"
	"unblind-desktop/internal/monitor"
	"unblind-desktop/internal/notify"
	"unblind-desktop/internal/parser"
	"unblind-desktop/internal/storage"
)

// App struct
type App struct {
	ctx                context.Context
	configManager      *config.Manager
	stateManager       *appstate.Manager
	browserDetector    *browser.Detector
	browserDownloader  *browser.Downloader
	authManager        *auth.Manager
	credentialsManager *credentials.Manager
	diagnosticsManager *diagnostics.Manager
	monitor            *monitor.Monitor
	notifier           *notify.Notifier
	storage            *storage.Storage
	dataDir            string
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Initialize data directory
	a.dataDir = a.getDataDir()

	// Initialize config manager
	configManager, err := config.NewManager(a.dataDir)
	if err != nil {
		println("Failed to initialize config:", err.Error())
		configManager, _ = config.NewManager(os.TempDir())
	}
	a.configManager = configManager

	// Initialize state manager
	a.stateManager = appstate.NewManager()

	// Initialize browser detector
	a.browserDetector = browser.NewDetector()

	// Initialize browser downloader
	a.browserDownloader = browser.NewDownloader(a.dataDir)

	// Initialize auth manager
	a.authManager = auth.NewManager(a.dataDir)

	// Initialize credentials manager
	a.credentialsManager = credentials.NewManager(a.dataDir)

	// Initialize diagnostics manager
	a.diagnosticsManager = diagnostics.NewManager(a.dataDir, "1.0.0")

	// Initialize notifier
	a.notifier = notify.NewNotifier()

	// Initialize storage
	stor, err := storage.NewStorage(a.dataDir)
	if err != nil {
		println("Failed to initialize storage:", err.Error())
	}
	a.storage = stor

	// Check for available browsers on startup
	browsers := a.browserDetector.DetectBrowsers()
	hasBrowser := false
	for _, b := range browsers {
		if b.IsValid {
			hasBrowser = true
			break
		}
	}
	a.stateManager.SetBrowserDetected(hasBrowser)
}

// shutdown is called when the app is closing
func (a *App) shutdown(ctx context.Context) {
	// Stop monitor if running
	if a.monitor != nil {
		a.monitor.Stop()
	}

	// Close browser if open
	if a.authManager != nil {
		a.authManager.CloseBrowser()
	}
}

// getDataDir returns the application data directory.
// When running inside a macOS .app bundle, data is stored in
// Contents/data/ so that deleting the .app removes all app data.
// On Windows, uses %APPDATA%\unblind\.
// Falls back to ~/.unblind/ otherwise.
func (a *App) getDataDir() string {
	if dir := bundleDataDir(); dir != "" {
		return dir
	}

	// Windows: use %APPDATA%\unblind\
	if runtime.GOOS == "windows" {
		appData := os.Getenv("APPDATA")
		if appData != "" {
			dataDir := filepath.Join(appData, "unblind")
			os.MkdirAll(dataDir, 0755)
			return dataDir
		}
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		return os.TempDir()
	}

	dataDir := filepath.Join(homeDir, ".unblind")
	os.MkdirAll(dataDir, 0755)
	return dataDir
}

// bundleDataDir returns <app>.app/Contents/data/ when the executable is
// running inside a macOS application bundle and that directory is writable.
// Returns "" otherwise (development mode, Linux, Windows, or read-only bundle).
func bundleDataDir() string {
	execPath, err := os.Executable()
	if err != nil {
		return ""
	}
	// Resolve symlinks (Wails dev mode may wrap the binary)
	execPath, err = filepath.EvalSymlinks(execPath)
	if err != nil {
		return ""
	}

	// Expected layout: .../Foo.app/Contents/MacOS/<binary>
	macosDir := filepath.Dir(execPath)
	if filepath.Base(macosDir) != "MacOS" {
		return "" // not inside a .app bundle
	}
	contentsDir := filepath.Dir(macosDir)
	if filepath.Base(contentsDir) != "Contents" {
		return ""
	}
	appDir := filepath.Dir(contentsDir)
	if !strings.HasSuffix(appDir, ".app") {
		return ""
	}

	dataDir := filepath.Join(contentsDir, "data")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return "" // bundle not writable (e.g. system-wide install without sudo)
	}

	// Quick write-access check
	probe := filepath.Join(dataDir, ".write-probe")
	if f, err := os.Create(probe); err != nil {
		return ""
	} else {
		f.Close()
		os.Remove(probe)
	}

	return dataDir
}

// GetConfig returns the current configuration
func (a *App) GetConfig() *config.AppConfig {
	return a.configManager.Get()
}

// SaveConfig saves the configuration
func (a *App) SaveConfig(cfg *config.AppConfig) error {
	return a.configManager.Save(cfg)
}

// GetAppState returns the current application state
func (a *App) GetAppState() *appstate.AppState {
	return a.stateManager.Get()
}

// DetectBrowsers returns all detected browsers
func (a *App) DetectBrowsers() []browser.BrowserInfo {
	return a.browserDetector.DetectBrowsers()
}

// GetBestBrowser returns the best available browser
func (a *App) GetBestBrowser() *browser.BrowserInfo {
	return a.browserDetector.GetBestBrowser()
}

// StartLoginFlow opens a browser window for login
func (a *App) StartLoginFlow() error {
	// Get browser path from config or use best available
	cfg := a.configManager.Get()
	browserPath := cfg.BrowserPath
	if browserPath == "" {
		best := a.browserDetector.GetBestBrowser()
		if best != nil {
			browserPath = best.Path
		}
	}

	err := a.authManager.StartLoginFlow(browserPath)
	if err != nil {
		a.stateManager.SetError(err.Error())
		return err
	}

	a.stateManager.SetState(appstate.StateNeedsLogin)
	return nil
}

// CheckLoginStatus checks if login was successful
func (a *App) CheckLoginStatus() (bool, error) {
	success, err := a.authManager.CheckLoginStatus()
	if err != nil {
		return false, err
	}

	if success {
		a.stateManager.SetSessionValid(true)
		a.stateManager.SetState(appstate.StateReady)
		// Notify frontend that login succeeded
		wailsRuntime.EventsEmit(a.ctx, "auth:login-detected")
	}

	return success, nil
}

// ValidateSession checks if the current session is valid
func (a *App) ValidateSession() (bool, error) {
	cfg := a.configManager.Get()
	browserPath := cfg.BrowserPath
	if browserPath == "" {
		best := a.browserDetector.GetBestBrowser()
		if best != nil {
			browserPath = best.Path
		}
	}

	valid, err := a.authManager.ValidateSession(browserPath)
	if err != nil {
		return false, err
	}

	a.stateManager.SetSessionValid(valid)
	if valid {
		a.stateManager.SetState(appstate.StateReady)
	} else {
		a.stateManager.SetState(appstate.StateNeedsLogin)
	}

	return valid, nil
}

// ClearSession clears the saved session
func (a *App) ClearSession() error {
	err := a.authManager.ClearSession()
	if err != nil {
		return err
	}

	a.stateManager.SetSessionValid(false)
	a.stateManager.SetState(appstate.StateNeedsLogin)
	return nil
}

// GetSession returns the current session info
func (a *App) GetSession() *auth.Session {
	return a.authManager.GetSession()
}

// NavigateToTarget navigates to the target page
func (a *App) NavigateToTarget() error {
	return a.authManager.NavigateToTarget()
}

// AutoFillCredentials fills in username and password
func (a *App) AutoFillCredentials(username, password string) error {
	return a.authManager.AutoFillCredentials(username, password)
}

// CloseBrowser closes the browser window
func (a *App) CloseBrowser() {
	a.authManager.CloseBrowser()
}

// ==================== Monitor APIs ====================

// StartMonitoring starts the monitoring loop
func (a *App) StartMonitoring() error {
	cfg := a.configManager.Get()

	// Get browser path
	browserPath := cfg.BrowserPath
	if browserPath == "" {
		best := a.browserDetector.GetBestBrowser()
		if best != nil {
			browserPath = best.Path
		}
	}

	// Create monitor config
	monitorCfg := monitor.Config{
		RefreshIntervalSec: cfg.RefreshIntervalSec,
		BarkEnabled:        cfg.BarkEnabled,
		BarkBaseURL:        cfg.BarkBaseURL,
		BrowserPath:        browserPath,
		ProfileDir:         filepath.Join(a.dataDir, "chrome-profile"),
		SessionFile:        filepath.Join(a.dataDir, "session.json"),
	}

	// Create monitor if not exists
	if a.monitor == nil {
		mon, err := monitor.NewMonitor(monitorCfg, a.storage)
		if err != nil {
			return err
		}
		a.monitor = mon

		// Set callbacks
		a.monitor.SetOnStatusChange(func(status monitor.MonitorStatus) {
			// Update app state based on monitor status
			switch status.State {
			case monitor.StateRunning:
				a.stateManager.SetState(appstate.StateRunning)
				a.stateManager.SetLastCheckTime(status.LastCheckTime)
				a.stateManager.SetNextCheckTime(status.NextCheckTime)
			case monitor.StateError:
				a.stateManager.SetError(status.LastError)
			case monitor.StateStopped:
				a.stateManager.SetState(appstate.StateReady)
			}
			// Push real-time status update to frontend
			wailsRuntime.EventsEmit(a.ctx, "monitor:status-changed", status)
		})

		a.monitor.SetOnResultsFound(func(results *parser.ParsedResults) {
			// Push real-time results update to frontend (only on change)
			wailsRuntime.EventsEmit(a.ctx, "monitor:results-updated", results)
		})

		a.monitor.SetOnCheckComplete(func(results *parser.ParsedResults) {
			// Push results after every check so dashboard always has latest
			wailsRuntime.EventsEmit(a.ctx, "monitor:check-complete", results)
		})
	} else {
		a.monitor.UpdateConfig(monitorCfg)
	}

	return a.monitor.Start()
}

// StopMonitoring stops the monitoring loop
func (a *App) StopMonitoring() {
	if a.monitor != nil {
		a.monitor.Stop()
	}
	a.stateManager.SetState(appstate.StateReady)
}

// PauseMonitoring pauses the monitoring loop
func (a *App) PauseMonitoring() {
	if a.monitor != nil {
		a.monitor.Pause()
	}
}

// ResumeMonitoring resumes the monitoring loop
func (a *App) ResumeMonitoring() {
	if a.monitor != nil {
		a.monitor.Resume()
	}
}

// GetMonitorStatus returns the current monitor status
func (a *App) GetMonitorStatus() *monitor.MonitorStatus {
	if a.monitor == nil {
		return &monitor.MonitorStatus{
			State: monitor.StateStopped,
		}
	}
	status := a.monitor.GetStatus()
	return &status
}

// CheckNow triggers an immediate check
func (a *App) CheckNow() (*parser.ParsedResults, error) {
	if a.monitor == nil {
		return nil, nil
	}
	return a.monitor.CheckNow()
}

// ==================== Results APIs ====================

// GetCurrentResults returns the current stored results
func (a *App) GetCurrentResults() *parser.ParsedResults {
	if a.storage == nil {
		return nil
	}
	return a.storage.GetCurrentResults()
}

// GetResultsHistory returns the results history
func (a *App) GetResultsHistory() []storage.HistoryItem {
	if a.storage == nil {
		return []storage.HistoryItem{}
	}
	return a.storage.GetHistory()
}

// ClearResultsHistory clears the results history
func (a *App) ClearResultsHistory() error {
	if a.storage == nil {
		return nil
	}
	return a.storage.ClearHistory()
}

// ==================== Notification APIs ====================

// TestBarkNotification sends a test notification
func (a *App) TestBarkNotification(barkURL string) error {
	return a.notifier.TestBarkNotification(barkURL)
}

// SendNotification sends a notification with the given title and body
func (a *App) SendNotification(title, body string) error {
	cfg := a.configManager.Get()
	if !cfg.BarkEnabled || cfg.BarkBaseURL == "" {
		return nil
	}
	return a.notifier.SendBarkNotification(cfg.BarkBaseURL, title, body)
}

// ==================== Browser Download APIs ====================

// IsKernelDownloaded checks if the browser kernel is already downloaded
func (a *App) IsKernelDownloaded() bool {
	return a.browserDownloader.IsKernelDownloaded()
}

// GetKernelPath returns the path to the downloaded kernel
func (a *App) GetKernelPath() string {
	return a.browserDownloader.GetKernelPath()
}

// DownloadBrowserKernel starts downloading the browser kernel
func (a *App) DownloadBrowserKernel() error {
	return a.browserDownloader.Download(a.ctx)
}

// GetDownloadProgress returns the current download progress
func (a *App) GetDownloadProgress() browser.DownloadProgress {
	return a.browserDownloader.GetProgress()
}

// CancelDownload cancels the ongoing download
func (a *App) CancelDownload() {
	a.browserDownloader.Cancel()
}

// DeleteKernel removes the downloaded kernel
func (a *App) DeleteKernel() error {
	return a.browserDownloader.Delete()
}

// ==================== Credentials APIs ====================

// SaveCredentials securely stores login credentials
func (a *App) SaveCredentials(username, password string) error {
	return a.credentialsManager.SaveCredentials(username, password)
}

// GetCredentials retrieves stored credentials
func (a *App) GetCredentials() (*credentials.Credentials, error) {
	return a.credentialsManager.GetCredentials()
}

// HasCredentials checks if credentials are stored
func (a *App) HasCredentials() bool {
	return a.credentialsManager.HasCredentials()
}

// DeleteCredentials removes stored credentials
func (a *App) DeleteCredentials() error {
	return a.credentialsManager.DeleteCredentials()
}

// ==================== Diagnostics APIs ====================

// GenerateDiagnosticReport generates a diagnostic report
func (a *App) GenerateDiagnosticReport() *diagnostics.DiagnosticReport {
	cfg := a.configManager.Get()
	state := a.stateManager.Get()
	history := []storage.HistoryItem{}
	if a.storage != nil {
		history = a.storage.GetHistory()
	}
	return a.diagnosticsManager.GenerateReport(cfg, state, history)
}

// ExportDiagnosticReport exports the diagnostic report to a file
func (a *App) ExportDiagnosticReport(outputPath string) error {
	report := a.GenerateDiagnosticReport()
	return a.diagnosticsManager.ExportReport(report, outputPath)
}

// GetDiagnosticReportAsString returns the diagnostic report as a JSON string
func (a *App) GetDiagnosticReportAsString() (string, error) {
	report := a.GenerateDiagnosticReport()
	return a.diagnosticsManager.ExportToString(report)
}

// GetDefaultDiagnosticPath returns the default export path for diagnostics
func (a *App) GetDefaultDiagnosticPath() string {
	return a.diagnosticsManager.GetDefaultExportPath()
}
