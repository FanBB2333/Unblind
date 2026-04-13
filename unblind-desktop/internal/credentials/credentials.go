package credentials

import (
	"encoding/json"
	"fmt"

	"github.com/zalando/go-keyring"
)

const (
	serviceName = "unblind-desktop"
	usernameKey = "zju-username"
	passwordKey = "zju-password"
)

// Credentials represents stored login credentials
type Credentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// Manager handles secure credential storage
type Manager struct{}

// NewManager creates a new credentials manager
func NewManager() *Manager {
	return &Manager{}
}

// SaveCredentials securely stores username and password
func (m *Manager) SaveCredentials(username, password string) error {
	// Store username
	if err := keyring.Set(serviceName, usernameKey, username); err != nil {
		return fmt.Errorf("failed to save username: %w", err)
	}

	// Store password
	if err := keyring.Set(serviceName, passwordKey, password); err != nil {
		return fmt.Errorf("failed to save password: %w", err)
	}

	return nil
}

// GetCredentials retrieves stored credentials
func (m *Manager) GetCredentials() (*Credentials, error) {
	username, err := keyring.Get(serviceName, usernameKey)
	if err != nil {
		if err == keyring.ErrNotFound {
			return nil, nil // No credentials stored
		}
		return nil, fmt.Errorf("failed to get username: %w", err)
	}

	password, err := keyring.Get(serviceName, passwordKey)
	if err != nil {
		if err == keyring.ErrNotFound {
			return &Credentials{Username: username}, nil
		}
		return nil, fmt.Errorf("failed to get password: %w", err)
	}

	return &Credentials{
		Username: username,
		Password: password,
	}, nil
}

// HasCredentials checks if credentials are stored
func (m *Manager) HasCredentials() bool {
	_, err := keyring.Get(serviceName, usernameKey)
	return err == nil
}

// DeleteCredentials removes stored credentials
func (m *Manager) DeleteCredentials() error {
	// Delete username (ignore not found errors)
	if err := keyring.Delete(serviceName, usernameKey); err != nil && err != keyring.ErrNotFound {
		return fmt.Errorf("failed to delete username: %w", err)
	}

	// Delete password (ignore not found errors)
	if err := keyring.Delete(serviceName, passwordKey); err != nil && err != keyring.ErrNotFound {
		return fmt.Errorf("failed to delete password: %w", err)
	}

	return nil
}

// ToJSON returns credentials as masked JSON for display
func (c *Credentials) ToJSON() string {
	masked := struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}{
		Username: c.Username,
		Password: maskPassword(c.Password),
	}
	data, _ := json.Marshal(masked)
	return string(data)
}

// maskPassword masks the password for display
func maskPassword(password string) string {
	if len(password) <= 2 {
		return "**"
	}
	return password[:1] + "****" + password[len(password)-1:]
}
