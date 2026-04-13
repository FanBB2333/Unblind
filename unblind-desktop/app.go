package main

import (
	"context"
	"os"
	"path/filepath"

	"unblind-desktop/internal/appstate"
	"unblind-desktop/internal/auth"
	"unblind-desktop/internal/browser"
	"unblind-desktop/internal/config"
)

// App struct
type App struct {
	ctx             context.Context
	configManager   *config.Manager
	stateManager    *appstate.Manager
	browserDetector *browser.Detector
	authManager     *auth.Manager
	dataDir         string
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

	// Initialize auth manager
	a.authManager = auth.NewManager(a.dataDir)

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
	// Close browser if open
	if a.authManager != nil {
		a.authManager.CloseBrowser()
	}
}

// getDataDir returns the application data directory
func (a *App) getDataDir() string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return os.TempDir()
	}

	dataDir := filepath.Join(homeDir, ".unblind")
	os.MkdirAll(dataDir, 0755)
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
