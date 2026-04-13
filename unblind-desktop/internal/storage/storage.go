package storage

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"

	"unblind-desktop/internal/parser"
)

const (
	ResultsFile     = "results.json"
	HistoryFile     = "history.json"
	MaxHistoryItems = 100
)

// HistoryItem represents a single history entry
type HistoryItem struct {
	Timestamp   time.Time             `json:"timestamp"`
	Hash        string                `json:"hash"`
	Results     *parser.ParsedResults `json:"results"`
	Description string                `json:"description"`
}

// StoredData represents the persisted data
type StoredData struct {
	CurrentResults *parser.ParsedResults `json:"currentResults"`
	LastHash       string                `json:"lastHash"`
	LastCheckTime  time.Time             `json:"lastCheckTime"`
}

// Storage handles persistence of results and history
type Storage struct {
	dataDir string
	data    *StoredData
	history []HistoryItem
	mu      sync.RWMutex
}

// NewStorage creates a new storage manager
func NewStorage(dataDir string) (*Storage, error) {
	s := &Storage{
		dataDir: dataDir,
		data:    &StoredData{},
		history: []HistoryItem{},
	}

	// Load existing data
	if err := s.loadData(); err != nil && !os.IsNotExist(err) {
		return nil, err
	}
	if err := s.loadHistory(); err != nil && !os.IsNotExist(err) {
		return nil, err
	}

	return s, nil
}

// GetCurrentResults returns the current stored results
func (s *Storage) GetCurrentResults() *parser.ParsedResults {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.data.CurrentResults
}

// GetLastHash returns the hash of the last stored results
func (s *Storage) GetLastHash() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.data.LastHash
}

// GetLastCheckTime returns the time of the last check
func (s *Storage) GetLastCheckTime() time.Time {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.data.LastCheckTime
}

// SaveResults saves new results and adds to history if changed
func (s *Storage) SaveResults(results *parser.ParsedResults, description string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Check if results changed
	changed := s.data.LastHash != results.Hash

	// Update current data
	s.data.CurrentResults = results
	s.data.LastHash = results.Hash
	s.data.LastCheckTime = time.Now()

	// Add to history if changed
	if changed && len(results.Reviews) > 0 {
		historyItem := HistoryItem{
			Timestamp:   time.Now(),
			Hash:        results.Hash,
			Results:     results,
			Description: description,
		}
		s.history = append([]HistoryItem{historyItem}, s.history...)

		// Trim history if too long
		if len(s.history) > MaxHistoryItems {
			s.history = s.history[:MaxHistoryItems]
		}

		// Save history
		if err := s.saveHistory(); err != nil {
			return err
		}
	}

	// Save current data
	return s.saveData()
}

// UpdateLastCheckTime updates the last check time without changing results
func (s *Storage) UpdateLastCheckTime() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.LastCheckTime = time.Now()
	return s.saveData()
}

// GetHistory returns the history items
func (s *Storage) GetHistory() []HistoryItem {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Return a copy
	historyCopy := make([]HistoryItem, len(s.history))
	copy(historyCopy, s.history)
	return historyCopy
}

// ClearHistory clears the history
func (s *Storage) ClearHistory() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.history = []HistoryItem{}
	return s.saveHistory()
}

func (s *Storage) loadData() error {
	path := filepath.Join(s.dataDir, ResultsFile)
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, s.data)
}

func (s *Storage) saveData() error {
	path := filepath.Join(s.dataDir, ResultsFile)
	data, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func (s *Storage) loadHistory() error {
	path := filepath.Join(s.dataDir, HistoryFile)
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, &s.history)
}

func (s *Storage) saveHistory() error {
	path := filepath.Join(s.dataDir, HistoryFile)
	data, err := json.MarshalIndent(s.history, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}
