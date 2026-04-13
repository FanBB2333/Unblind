package monitor

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/chromedp/chromedp"

	"unblind-desktop/internal/notify"
	"unblind-desktop/internal/parser"
	"unblind-desktop/internal/storage"
)

const (
	TargetURL = "https://yjsy.zju.edu.cn/dashboard/workplace?dm=xw_sqzt&mode=2&role=1&back=dashboard"
)

// MonitorState represents the current state of the monitor
type MonitorState string

const (
	StateStopped  MonitorState = "stopped"
	StateStarting MonitorState = "starting"
	StateRunning  MonitorState = "running"
	StatePaused   MonitorState = "paused"
	StateError    MonitorState = "error"
)

// MonitorStatus represents the current status of the monitor
type MonitorStatus struct {
	State         MonitorState `json:"state"`
	LastCheckTime string       `json:"lastCheckTime"`
	NextCheckTime string       `json:"nextCheckTime"`
	LastError     string       `json:"lastError"`
	CheckCount    int          `json:"checkCount"`
}

// Config holds the monitor configuration
type Config struct {
	RefreshIntervalSec int
	BarkEnabled        bool
	BarkBaseURL        string
	BrowserPath        string
	ProfileDir         string
}

// Monitor handles periodic checking of review results
type Monitor struct {
	config   Config
	parser   *parser.Parser
	notifier *notify.Notifier
	storage  *storage.Storage
	status   MonitorStatus
	mu       sync.RWMutex

	browserCtx context.Context
	cancelFunc context.CancelFunc
	stopChan   chan struct{}
	doneChan   chan struct{}

	onStatusChange  func(MonitorStatus)
	onResultsFound  func(*parser.ParsedResults)
	onCheckComplete func(*parser.ParsedResults)
}

// NewMonitor creates a new monitor with a shared storage instance
func NewMonitor(config Config, stor *storage.Storage) (*Monitor, error) {
	// Ensure profile directory exists
	if config.ProfileDir == "" {
		return nil, fmt.Errorf("profile directory must be specified")
	}
	os.MkdirAll(config.ProfileDir, 0755)

	return &Monitor{
		config:   config,
		parser:   parser.NewParser(),
		notifier: notify.NewNotifier(),
		storage:  stor,
		status: MonitorStatus{
			State: StateStopped,
		},
	}, nil
}

// GetStatus returns the current monitor status
func (m *Monitor) GetStatus() MonitorStatus {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.status
}

// GetStorage returns the storage manager
func (m *Monitor) GetStorage() *storage.Storage {
	return m.storage
}

// SetOnStatusChange sets the callback for status changes
func (m *Monitor) SetOnStatusChange(callback func(MonitorStatus)) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.onStatusChange = callback
}

// SetOnResultsFound sets the callback for when new results are found
func (m *Monitor) SetOnResultsFound(callback func(*parser.ParsedResults)) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.onResultsFound = callback
}

// SetOnCheckComplete sets the callback for when each check completes (regardless of change)
func (m *Monitor) SetOnCheckComplete(callback func(*parser.ParsedResults)) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.onCheckComplete = callback
}

// UpdateConfig updates the monitor configuration
func (m *Monitor) UpdateConfig(config Config) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.config = config
}

// Start begins the monitoring loop
func (m *Monitor) Start() error {
	m.mu.Lock()
	if m.status.State == StateRunning {
		m.mu.Unlock()
		return fmt.Errorf("monitor is already running")
	}

	m.status.State = StateStarting
	m.stopChan = make(chan struct{})
	m.doneChan = make(chan struct{})
	m.mu.Unlock()

	m.updateStatus()

	// Initialize browser
	if err := m.initBrowser(); err != nil {
		m.setError(fmt.Sprintf("Failed to initialize browser: %v", err))
		return err
	}

	// Start the monitoring goroutine
	go m.runLoop()

	return nil
}

// Stop stops the monitoring loop
func (m *Monitor) Stop() {
	m.mu.Lock()
	if m.status.State == StateStopped {
		m.mu.Unlock()
		return
	}

	if m.stopChan != nil {
		close(m.stopChan)
	}
	m.mu.Unlock()

	// Wait for the loop to finish
	if m.doneChan != nil {
		<-m.doneChan
	}

	// Cleanup browser
	m.cleanupBrowser()

	m.mu.Lock()
	m.status.State = StateStopped
	m.status.NextCheckTime = ""
	m.mu.Unlock()
	m.updateStatus()
}

// Pause pauses the monitoring loop
func (m *Monitor) Pause() {
	m.mu.Lock()
	if m.status.State == StateRunning {
		m.status.State = StatePaused
	}
	m.mu.Unlock()
	m.updateStatus()
}

// Resume resumes the monitoring loop
func (m *Monitor) Resume() {
	m.mu.Lock()
	if m.status.State == StatePaused {
		m.status.State = StateRunning
	}
	m.mu.Unlock()
	m.updateStatus()
}

// CheckNow triggers an immediate check
func (m *Monitor) CheckNow() (*parser.ParsedResults, error) {
	m.mu.RLock()
	ctx := m.browserCtx
	m.mu.RUnlock()

	if ctx == nil {
		return nil, fmt.Errorf("browser not initialized")
	}

	return m.performCheck()
}

func (m *Monitor) initBrowser() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Cancel any existing context
	if m.cancelFunc != nil {
		m.cancelFunc()
	}

	// The login flow uses the same Chrome profile in headed mode. If that
	// process exited uncleanly or is still winding down, Singleton* files can
	// block headless Chrome from starting with the shared profile.
	killChromeByProfile(m.config.ProfileDir)
	time.Sleep(300 * time.Millisecond)
	cleanChromeLockFiles(m.config.ProfileDir)

	// Setup chromedp options - use headless mode for monitoring
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", true),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.UserDataDir(m.config.ProfileDir),
		chromedp.WindowSize(1920, 1080),
	)

	if m.config.BrowserPath != "" {
		opts = append(opts, chromedp.ExecPath(m.config.BrowserPath))
	}

	allocCtx, allocCancel := chromedp.NewExecAllocator(context.Background(), opts...)
	ctx, cancel := chromedp.NewContext(allocCtx)

	m.browserCtx = ctx
	m.cancelFunc = func() {
		cancel()
		allocCancel()
	}

	return nil
}

func (m *Monitor) cleanupBrowser() {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.cancelFunc != nil {
		m.cancelFunc()
		m.cancelFunc = nil
		m.browserCtx = nil
	}
}

func (m *Monitor) runLoop() {
	defer close(m.doneChan)

	m.mu.Lock()
	m.status.State = StateRunning
	m.mu.Unlock()
	m.updateStatus()

	// Perform initial check
	if _, err := m.performCheck(); err != nil {
		m.setError(fmt.Sprintf("Initial check failed: %v", err))
	}

	// Calculate interval
	interval := time.Duration(m.config.RefreshIntervalSec) * time.Second
	if interval < 60*time.Second {
		interval = 60 * time.Second
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-m.stopChan:
			return
		case <-ticker.C:
			m.mu.RLock()
			state := m.status.State
			m.mu.RUnlock()

			if state == StatePaused {
				continue
			}

			if _, err := m.performCheck(); err != nil {
				m.setError(fmt.Sprintf("Check failed: %v", err))
			}
		}
	}
}

func (m *Monitor) performCheck() (*parser.ParsedResults, error) {
	m.mu.RLock()
	ctx := m.browserCtx
	m.mu.RUnlock()

	if ctx == nil {
		return nil, fmt.Errorf("browser context not available")
	}

	// Navigate to target page
	err := chromedp.Run(ctx,
		chromedp.Navigate(TargetURL),
		chromedp.Sleep(3*time.Second),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to navigate: %w", err)
	}

	// Check if we need to login
	var currentURL string
	if err := chromedp.Run(ctx, chromedp.Location(&currentURL)); err != nil {
		return nil, fmt.Errorf("failed to get current URL: %w", err)
	}

	if strings.Contains(currentURL, "zjuam.zju.edu.cn") {
		return nil, fmt.Errorf("session expired, need to re-login")
	}

	// Extract results
	results, err := m.parser.ExtractResults(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to extract results: %w", err)
	}

	// Update status
	m.mu.Lock()
	m.status.LastCheckTime = time.Now().Format(time.RFC3339)
	m.status.CheckCount++
	m.status.NextCheckTime = time.Now().Add(time.Duration(m.config.RefreshIntervalSec) * time.Second).Format(time.RFC3339)
	m.status.LastError = ""
	m.mu.Unlock()

	// Check if results changed
	lastHash := m.storage.GetLastHash()
	if m.parser.ResultsChanged(results, lastHash) && m.parser.HasResults(results) {
		// Generate description
		description := m.generateChangeDescription(results)

		// Save results
		if err := m.storage.SaveResults(results, description); err != nil {
			fmt.Printf("Failed to save results: %v\n", err)
		}

		// Send notification
		if m.config.BarkEnabled && m.config.BarkBaseURL != "" {
			title := "盲审结果更新"
			body := m.parser.FormatNotificationBody(results)
			if err := m.notifier.SendBarkNotification(m.config.BarkBaseURL, title, body); err != nil {
				fmt.Printf("Failed to send notification: %v\n", err)
			}
		}

		// Callback
		m.mu.RLock()
		callback := m.onResultsFound
		m.mu.RUnlock()
		if callback != nil {
			callback(results)
		}
	} else {
		// Just update check time
		m.storage.UpdateLastCheckTime()
	}

	m.updateStatus()

	// Always notify frontend of latest results after each check
	m.mu.RLock()
	checkCallback := m.onCheckComplete
	m.mu.RUnlock()
	if checkCallback != nil {
		checkCallback(results)
	}

	return results, nil
}

func (m *Monitor) generateChangeDescription(results *parser.ParsedResults) string {
	if len(results.Reviews) == 0 {
		return "无评审结果"
	}

	parts := []string{}
	for i, r := range results.Reviews {
		parts = append(parts, fmt.Sprintf("专家%d: %s", i+1, r.ReviewResult))
	}
	return strings.Join(parts, ", ")
}

func (m *Monitor) setError(errMsg string) {
	m.mu.Lock()
	m.status.State = StateError
	m.status.LastError = errMsg
	m.mu.Unlock()
	m.updateStatus()
}

func (m *Monitor) updateStatus() {
	m.mu.RLock()
	callback := m.onStatusChange
	status := m.status
	m.mu.RUnlock()

	if callback != nil {
		callback(status)
	}
}

// killChromeByProfile reads the PID from SingletonLock and kills that process.
// This prevents headless monitoring from failing when the previous headed
// login browser has not released the shared profile yet.
func killChromeByProfile(profileDir string) {
	lockPath := filepath.Join(profileDir, "SingletonLock")
	target, err := os.Readlink(lockPath)
	if err != nil {
		return
	}
	parts := strings.Split(target, "-")
	if len(parts) == 0 {
		return
	}
	pid, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		return
	}
	proc, err := os.FindProcess(pid)
	if err != nil {
		return
	}
	_ = proc.Kill()
}

// cleanChromeLockFiles removes Singleton* files left by a crashed or recently
// closed Chrome instance.
func cleanChromeLockFiles(profileDir string) {
	for _, name := range []string{"SingletonLock", "SingletonCookie", "SingletonSocket"} {
		_ = os.Remove(filepath.Join(profileDir, name))
	}
}
