package main

import (
	"context"
	"os"
	"path/filepath"

	"unblind-desktop/internal/appstate"
	"unblind-desktop/internal/config"
)

// App struct
type App struct {
	ctx           context.Context
	configManager *config.Manager
	stateManager  *appstate.Manager
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Initialize config manager
	dataDir := a.getDataDir()
	configManager, err := config.NewManager(dataDir)
	if err != nil {
		println("Failed to initialize config:", err.Error())
		configManager, _ = config.NewManager(os.TempDir())
	}
	a.configManager = configManager

	// Initialize state manager
	a.stateManager = appstate.NewManager()
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
