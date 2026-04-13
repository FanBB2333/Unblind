package diagnostics

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"unblind-desktop/internal/appstate"
	"unblind-desktop/internal/config"
	"unblind-desktop/internal/storage"
)

// DiagnosticReport contains all diagnostic information
type DiagnosticReport struct {
	Timestamp string                `json:"timestamp"`
	Version   string                `json:"version"`
	Platform  PlatformInfo          `json:"platform"`
	Config    ConfigInfo            `json:"config"`
	State     StateInfo             `json:"state"`
	History   []storage.HistoryItem `json:"history"`
	Logs      []LogEntry            `json:"logs"`
}

// PlatformInfo contains platform information
type PlatformInfo struct {
	OS        string `json:"os"`
	Arch      string `json:"arch"`
	NumCPU    int    `json:"numCPU"`
	GoVersion string `json:"goVersion"`
}

// ConfigInfo contains sanitized configuration
type ConfigInfo struct {
	RefreshIntervalSec int    `json:"refreshIntervalSec"`
	BarkEnabled        bool   `json:"barkEnabled"`
	BarkURLConfigured  bool   `json:"barkURLConfigured"`
	BrowserPath        string `json:"browserPath"`
}

// StateInfo contains current application state
type StateInfo struct {
	State             string `json:"state"`
	IsSessionValid    bool   `json:"isSessionValid"`
	IsBrowserDetected bool   `json:"isBrowserDetected"`
	LastError         string `json:"lastError"`
}

// LogEntry represents a log entry
type LogEntry struct {
	Timestamp string `json:"timestamp"`
	Level     string `json:"level"`
	Message   string `json:"message"`
}

// Manager handles diagnostic operations
type Manager struct {
	dataDir string
	version string
	logs    []LogEntry
}

// NewManager creates a new diagnostics manager
func NewManager(dataDir, version string) *Manager {
	return &Manager{
		dataDir: dataDir,
		version: version,
		logs:    make([]LogEntry, 0),
	}
}

// AddLog adds a log entry
func (m *Manager) AddLog(level, message string) {
	entry := LogEntry{
		Timestamp: time.Now().Format(time.RFC3339),
		Level:     level,
		Message:   message,
	}
	m.logs = append(m.logs, entry)

	// Keep only the last 1000 entries
	if len(m.logs) > 1000 {
		m.logs = m.logs[len(m.logs)-1000:]
	}
}

// GenerateReport generates a diagnostic report
func (m *Manager) GenerateReport(cfg *config.AppConfig, state *appstate.AppState, history []storage.HistoryItem) *DiagnosticReport {
	report := &DiagnosticReport{
		Timestamp: time.Now().Format(time.RFC3339),
		Version:   m.version,
		Platform: PlatformInfo{
			OS:        runtime.GOOS,
			Arch:      runtime.GOARCH,
			NumCPU:    runtime.NumCPU(),
			GoVersion: runtime.Version(),
		},
		Config: ConfigInfo{
			RefreshIntervalSec: cfg.RefreshIntervalSec,
			BarkEnabled:        cfg.BarkEnabled,
			BarkURLConfigured:  cfg.BarkBaseURL != "",
			BrowserPath:        cfg.BrowserPath,
		},
		State: StateInfo{
			State:             string(state.State),
			IsSessionValid:    state.SessionValid,
			IsBrowserDetected: state.BrowserDetected,
			LastError:         state.LastError,
		},
		History: history,
		Logs:    m.logs,
	}

	return report
}

// ExportReport exports the diagnostic report to a file
func (m *Manager) ExportReport(report *DiagnosticReport, outputPath string) error {
	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal report: %w", err)
	}

	// Ensure directory exists
	dir := filepath.Dir(outputPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	if err := os.WriteFile(outputPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	return nil
}

// GetDefaultExportPath returns the default export path
func (m *Manager) GetDefaultExportPath() string {
	homeDir, _ := os.UserHomeDir()
	filename := fmt.Sprintf("unblind-diagnostic-%s.json", time.Now().Format("2006-01-02-150405"))
	return filepath.Join(homeDir, "Downloads", filename)
}

// ExportToString returns the report as a JSON string
func (m *Manager) ExportToString(report *DiagnosticReport) (string, error) {
	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal report: %w", err)
	}
	return string(data), nil
}
