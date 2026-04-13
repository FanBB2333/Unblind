package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/chromedp/cdproto/network"
	"github.com/chromedp/chromedp"
)

const (
	// Target URLs
	TargetURL = "https://yjsy.zju.edu.cn/dashboard/workplace?dm=xw_sqzt&mode=2&role=1&back=dashboard"
	LoginURL  = "https://zjuam.zju.edu.cn/cas/login"

	// Session file name
	SessionFile = "session.json"
)

// Session represents a saved login session
type Session struct {
	Cookies       []*network.Cookie `json:"cookies"`
	LastLoginTime string            `json:"lastLoginTime"`
	BrowserMode   string            `json:"browserMode"`
	ProfileDir    string            `json:"profileDir"`
	IsValid       bool              `json:"isValid"`
}

// Manager handles authentication and session management
type Manager struct {
	dataDir    string
	session    *Session
	mu         sync.RWMutex
	browserCtx context.Context
	cancelFunc context.CancelFunc
}

// NewManager creates a new auth manager
func NewManager(dataDir string) *Manager {
	m := &Manager{
		dataDir: dataDir,
		session: &Session{},
	}
	m.loadSession()
	return m
}

// GetSession returns the current session
func (m *Manager) GetSession() *Session {
	m.mu.RLock()
	defer m.mu.RUnlock()
	s := *m.session
	return &s
}

// StartLoginFlow opens a browser window for manual login
func (m *Manager) StartLoginFlow(browserPath string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Cancel any existing browser context
	if m.cancelFunc != nil {
		m.cancelFunc()
		m.cancelFunc = nil
		m.browserCtx = nil
	}

	// Create profile directory
	profileDir := filepath.Join(m.dataDir, "chrome-profile")
	if err := os.MkdirAll(profileDir, 0755); err != nil {
		return fmt.Errorf("failed to create profile directory: %w", err)
	}

	// Kill any stale Chrome process holding the profile lock,
	// then clean the lock files so Chrome can start fresh.
	killChromeByProfile(profileDir)
	time.Sleep(300 * time.Millisecond)
	cleanChromeLockFiles(profileDir)

	// Setup chromedp options
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", false),
		chromedp.Flag("disable-gpu", false),
		chromedp.Flag("enable-automation", false),
		chromedp.Flag("disable-extensions", false),
		chromedp.UserDataDir(profileDir),
		chromedp.WindowSize(1200, 800),
	)

	// Use custom browser path if provided
	if browserPath != "" {
		opts = append(opts, chromedp.ExecPath(browserPath))
	}

	// Create allocator context
	allocCtx, allocCancel := chromedp.NewExecAllocator(context.Background(), opts...)

	// Create browser context
	ctx, cancel := chromedp.NewContext(allocCtx)
	m.browserCtx = ctx
	m.cancelFunc = func() {
		cancel()
		allocCancel()
	}

	// Navigate to login page in background
	go func() {
		err := chromedp.Run(ctx,
			chromedp.Navigate(LoginURL),
		)
		if err != nil {
			fmt.Printf("Failed to navigate: %v\n", err)
		}
	}()

	m.session.ProfileDir = profileDir
	return nil
}

// CheckLoginStatus checks if login was successful
func (m *Manager) CheckLoginStatus() (bool, error) {
	m.mu.RLock()
	ctx := m.browserCtx
	m.mu.RUnlock()

	if ctx == nil {
		return false, fmt.Errorf("no browser context")
	}

	var currentURL string
	err := chromedp.Run(ctx,
		chromedp.Location(&currentURL),
	)
	if err != nil {
		return false, err
	}

	// Check if we're on the target page (not the login page)
	if strings.Contains(currentURL, "yjsy.zju.edu.cn") && !strings.Contains(currentURL, "zjuam.zju.edu.cn") {
		// Extract and save cookies
		if err := m.saveCookies(); err != nil {
			return false, err
		}
		return true, nil
	}

	return false, nil
}

// NavigateToTarget navigates to the target page
func (m *Manager) NavigateToTarget() error {
	m.mu.RLock()
	ctx := m.browserCtx
	m.mu.RUnlock()

	if ctx == nil {
		return fmt.Errorf("no browser context")
	}

	return chromedp.Run(ctx,
		chromedp.Navigate(TargetURL),
	)
}

// ValidateSession checks if the current session is still valid
func (m *Manager) ValidateSession(browserPath string) (bool, error) {
	m.mu.Lock()

	// Check if we have saved cookies
	if len(m.session.Cookies) == 0 {
		m.mu.Unlock()
		return false, nil
	}

	// Cancel any existing browser context
	if m.cancelFunc != nil {
		m.cancelFunc()
		m.cancelFunc = nil
		m.browserCtx = nil
	}

	profileDir := m.session.ProfileDir
	if profileDir == "" {
		profileDir = filepath.Join(m.dataDir, "chrome-profile")
	}

	// Kill stale Chrome and clean lock files
	killChromeByProfile(profileDir)
	time.Sleep(300 * time.Millisecond)
	cleanChromeLockFiles(profileDir)

	// Setup headless browser to validate session
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", true),
		chromedp.UserDataDir(profileDir),
	)

	if browserPath != "" {
		opts = append(opts, chromedp.ExecPath(browserPath))
	}

	allocCtx, allocCancel := chromedp.NewExecAllocator(context.Background(), opts...)
	ctx, cancel := chromedp.NewContext(allocCtx)
	m.browserCtx = ctx
	m.cancelFunc = func() {
		cancel()
		allocCancel()
	}
	m.mu.Unlock()

	// Try to access the target page
	var currentURL string
	err := chromedp.Run(ctx,
		chromedp.Navigate(TargetURL),
		chromedp.Sleep(2*time.Second),
		chromedp.Location(&currentURL),
	)
	if err != nil {
		return false, err
	}

	// Check if we're on the target page (not redirected to login)
	if strings.Contains(currentURL, "yjsy.zju.edu.cn") &&
		strings.Contains(currentURL, "xw_sqzt") &&
		!strings.Contains(currentURL, "zjuam.zju.edu.cn") {
		m.mu.Lock()
		m.session.IsValid = true
		m.mu.Unlock()
		return true, nil
	}

	m.mu.Lock()
	m.session.IsValid = false
	m.mu.Unlock()
	return false, nil
}

// ClearSession clears the saved session
func (m *Manager) ClearSession() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Cancel browser context
	if m.cancelFunc != nil {
		m.cancelFunc()
		m.cancelFunc = nil
		m.browserCtx = nil
	}

	// Clear session data
	m.session = &Session{}

	// Remove session file
	sessionPath := filepath.Join(m.dataDir, SessionFile)
	if err := os.Remove(sessionPath); err != nil && !os.IsNotExist(err) {
		return err
	}

	// Remove profile directory
	profileDir := filepath.Join(m.dataDir, "chrome-profile")
	if err := os.RemoveAll(profileDir); err != nil {
		return err
	}

	return nil
}

// CloseBrowser closes the browser window
func (m *Manager) CloseBrowser() {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.cancelFunc != nil {
		m.cancelFunc()
		m.cancelFunc = nil
		m.browserCtx = nil
	}
}

// AutoFillCredentials fills in username and password
func (m *Manager) AutoFillCredentials(username, password string) error {
	m.mu.RLock()
	ctx := m.browserCtx
	m.mu.RUnlock()

	if ctx == nil {
		return fmt.Errorf("no browser context")
	}

	return chromedp.Run(ctx,
		chromedp.WaitVisible(`#username`, chromedp.ByID),
		chromedp.Clear(`#username`, chromedp.ByID),
		chromedp.SendKeys(`#username`, username, chromedp.ByID),
		chromedp.Clear(`#password`, chromedp.ByID),
		chromedp.SendKeys(`#password`, password, chromedp.ByID),
	)
}

func (m *Manager) saveCookies() error {
	ctx := m.browserCtx
	if ctx == nil {
		return fmt.Errorf("no browser context")
	}

	var cookies []*network.Cookie
	err := chromedp.Run(ctx,
		chromedp.ActionFunc(func(ctx context.Context) error {
			c, err := network.GetCookies().Do(ctx)
			if err != nil {
				return err
			}
			cookies = c
			return nil
		}),
	)
	if err != nil {
		return err
	}

	m.session.Cookies = cookies
	m.session.LastLoginTime = time.Now().Format(time.RFC3339)
	m.session.IsValid = true

	return m.saveSession()
}

func (m *Manager) loadSession() error {
	sessionPath := filepath.Join(m.dataDir, SessionFile)
	data, err := os.ReadFile(sessionPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	return json.Unmarshal(data, m.session)
}

func (m *Manager) saveSession() error {
	sessionPath := filepath.Join(m.dataDir, SessionFile)
	data, err := json.MarshalIndent(m.session, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(sessionPath, data, 0644)
}

// killChromeByProfile reads the PID from SingletonLock and kills that process.
// This handles the case where a previous chromedp Chrome was not cleaned up
// (e.g., after a panic or hard crash), which would otherwise cause the next
// Chrome launch to print "Opening in existing browser session." and exit.
func killChromeByProfile(profileDir string) {
	lockPath := filepath.Join(profileDir, "SingletonLock")
	target, err := os.Readlink(lockPath)
	if err != nil {
		return // lock file absent or not a symlink — nothing to kill
	}
	// target format is "<hostname>-<PID>" on macOS/Linux
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
	_ = proc.Kill() // ignore error — process may already be gone
}

// cleanChromeLockFiles removes Singleton* files left by a crashed Chrome instance.
func cleanChromeLockFiles(profileDir string) {
	for _, name := range []string{"SingletonLock", "SingletonCookie", "SingletonSocket"} {
		os.Remove(filepath.Join(profileDir, name))
	}
}
