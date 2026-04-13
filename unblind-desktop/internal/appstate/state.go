package appstate

import (
	"sync"
	"time"
)

// State represents the application state
type State string

const (
	StateIdle           State = "idle"
	StateNeedsLogin     State = "needs_login"
	StateReady          State = "ready"
	StateRunning        State = "running"
	StateSessionExpired State = "session_expired"
	StateError          State = "error"
)

// AppState represents the full application state snapshot
type AppState struct {
	State           State     `json:"state"`
	LastCheckTime   time.Time `json:"lastCheckTime"`
	NextCheckTime   time.Time `json:"nextCheckTime"`
	LastError       string    `json:"lastError"`
	BrowserDetected bool      `json:"browserDetected"`
	SessionValid    bool      `json:"sessionValid"`
}

// Manager manages the application state
type Manager struct {
	state *AppState
	mu    sync.RWMutex
}

// NewManager creates a new state manager
func NewManager() *Manager {
	return &Manager{
		state: &AppState{
			State: StateIdle,
		},
	}
}

// Get returns the current state
func (m *Manager) Get() *AppState {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Return a copy
	s := *m.state
	return &s
}

// SetState updates the state
func (m *Manager) SetState(state State) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.State = state
}

// SetLastCheckTime updates the last check time
func (m *Manager) SetLastCheckTime(t time.Time) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.LastCheckTime = t
}

// SetNextCheckTime updates the next check time
func (m *Manager) SetNextCheckTime(t time.Time) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.NextCheckTime = t
}

// SetError sets the error state
func (m *Manager) SetError(err string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.State = StateError
	m.state.LastError = err
}

// SetBrowserDetected updates browser detection status
func (m *Manager) SetBrowserDetected(detected bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.BrowserDetected = detected
}

// SetSessionValid updates session validity status
func (m *Manager) SetSessionValid(valid bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.SessionValid = valid
	if !valid {
		m.state.State = StateNeedsLogin
	}
}
