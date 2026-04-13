package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

// AppConfig represents the application configuration
type AppConfig struct {
	RefreshIntervalSec        int    `json:"refreshIntervalSec"`
	BrowserMode               string `json:"browserMode"` // "system" or "downloaded"
	BrowserPath               string `json:"browserPath"`
	DownloadedKernelPath      string `json:"downloadedKernelPath"`
	BarkEnabled               bool   `json:"barkEnabled"`
	BarkBaseURL               string `json:"barkBaseUrl"`
	SystemNotificationEnabled bool   `json:"systemNotificationEnabled"`
	RememberCredentials       bool   `json:"rememberCredentials"`
	AutoFillCredentials       bool   `json:"autoFillCredentials"`
	AutoResumeMonitoring      bool   `json:"autoResumeMonitoring"`
}

// DefaultConfig returns the default configuration
func DefaultConfig() *AppConfig {
	return &AppConfig{
		RefreshIntervalSec:        300,
		BrowserMode:               "system",
		BrowserPath:               "",
		DownloadedKernelPath:      "",
		BarkEnabled:               true,
		BarkBaseURL:               "",
		SystemNotificationEnabled: false,
		RememberCredentials:       false,
		AutoFillCredentials:       false,
		AutoResumeMonitoring:      false,
	}
}

// Manager handles configuration persistence
type Manager struct {
	config   *AppConfig
	filePath string
	mu       sync.RWMutex
}

// NewManager creates a new config manager
func NewManager(dataDir string) (*Manager, error) {
	configPath := filepath.Join(dataDir, "config.json")

	m := &Manager{
		config:   DefaultConfig(),
		filePath: configPath,
	}

	// Load existing config if exists
	if err := m.load(); err != nil && !os.IsNotExist(err) {
		return nil, err
	}

	return m, nil
}

// Get returns the current configuration
func (m *Manager) Get() *AppConfig {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Return a copy
	cfg := *m.config
	return &cfg
}

// Save saves the configuration
func (m *Manager) Save(cfg *AppConfig) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.config = cfg

	// Ensure directory exists
	dir := filepath.Dir(m.filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(m.filePath, data, 0644)
}

func (m *Manager) load() error {
	data, err := os.ReadFile(m.filePath)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, m.config)
}
