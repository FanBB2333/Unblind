package credentials

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

const credentialsFile = "credentials.enc"

// Credentials represents stored login credentials
type Credentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// Manager handles credential storage in the app data directory.
// Credentials are encrypted with AES-256-GCM using a key derived from
// the machine hardware UUID, so the file is only usable on the same machine.
type Manager struct {
	dataDir string
}

// NewManager creates a new credentials manager that stores data under dataDir.
func NewManager(dataDir string) *Manager {
	return &Manager{dataDir: dataDir}
}

// SaveCredentials encrypts and stores username and password.
func (m *Manager) SaveCredentials(username, password string) error {
	data, err := json.Marshal(&Credentials{Username: username, Password: password})
	if err != nil {
		return fmt.Errorf("failed to marshal credentials: %w", err)
	}

	key := m.deriveKey()
	encrypted, err := encryptAESGCM(key, data)
	if err != nil {
		return fmt.Errorf("failed to encrypt credentials: %w", err)
	}

	path := filepath.Join(m.dataDir, credentialsFile)
	if err := os.WriteFile(path, encrypted, 0600); err != nil {
		return fmt.Errorf("failed to write credentials file: %w", err)
	}
	return nil
}

// GetCredentials decrypts and returns stored credentials.
// Returns nil, nil if no credentials are stored yet.
func (m *Manager) GetCredentials() (*Credentials, error) {
	path := filepath.Join(m.dataDir, credentialsFile)
	encrypted, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to read credentials file: %w", err)
	}

	key := m.deriveKey()
	data, err := decryptAESGCM(key, encrypted)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt credentials: %w", err)
	}

	var creds Credentials
	if err := json.Unmarshal(data, &creds); err != nil {
		return nil, fmt.Errorf("failed to parse credentials: %w", err)
	}
	return &creds, nil
}

// HasCredentials reports whether credentials have been saved.
func (m *Manager) HasCredentials() bool {
	path := filepath.Join(m.dataDir, credentialsFile)
	_, err := os.Stat(path)
	return err == nil
}

// DeleteCredentials removes the stored credentials file.
func (m *Manager) DeleteCredentials() error {
	path := filepath.Join(m.dataDir, credentialsFile)
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete credentials file: %w", err)
	}
	return nil
}

// ToJSON returns credentials as masked JSON for display.
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

func maskPassword(password string) string {
	if len(password) <= 2 {
		return "**"
	}
	return password[:1] + "****" + password[len(password)-1:]
}

// deriveKey returns a 32-byte AES key derived from a machine-specific identifier.
// Falls back to hostname+home directory if the platform identifier cannot be read.
func (m *Manager) deriveKey() []byte {
	seed := machineID()
	// Mix in an app-specific salt so the key is unique to this application.
	h := sha256.Sum256([]byte("unblind-desktop:" + seed))
	return h[:]
}

// machineID returns a machine-specific identifier string.
func machineID() string {
	switch runtime.GOOS {
	case "darwin":
		if id := macPlatformUUID(); id != "" {
			return id
		}
	case "windows":
		if id := windowsMachineID(); id != "" {
			return id
		}
	}

	// Fallback: hostname + home directory
	hostname, _ := os.Hostname()
	home, _ := os.UserHomeDir()
	return hostname + ":" + home
}

func macPlatformUUID() string {
	out, err := exec.Command("ioreg", "-rd1", "-c", "IOPlatformExpertDevice").Output()
	if err != nil {
		return ""
	}

	for _, line := range strings.Split(string(out), "\n") {
		if !strings.Contains(line, "IOPlatformUUID") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		uuid := strings.TrimSpace(parts[1])
		uuid = strings.Trim(uuid, `" `)
		if uuid != "" {
			return uuid
		}
	}

	return ""
}

func windowsMachineID() string {
	if id := commandMachineID(
		exec.Command("reg", "query", `HKLM\SOFTWARE\Microsoft\Cryptography`, "/v", "MachineGuid"),
		parseWindowsRegistryMachineID,
	); id != "" {
		return id
	}

	if id := commandMachineID(
		exec.Command("powershell", "-NoProfile", "-Command", "(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Cryptography').MachineGuid"),
		parseFirstNonEmptyLine,
	); id != "" {
		return id
	}

	if id := commandMachineID(
		exec.Command("wmic", "csproduct", "get", "uuid"),
		parseWindowsWMIUUID,
	); id != "" {
		return id
	}

	return ""
}

func commandMachineID(cmd *exec.Cmd, parse func(string) string) string {
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	return parse(string(out))
}

func parseWindowsRegistryMachineID(output string) string {
	for _, line := range strings.Split(output, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || !strings.Contains(line, "MachineGuid") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) >= 3 {
			return fields[len(fields)-1]
		}
	}
	return ""
}

func parseWindowsWMIUUID(output string) string {
	for _, line := range strings.Split(strings.TrimSpace(output), "\n") {
		line = strings.TrimSpace(line)
		if line != "" && !strings.EqualFold(line, "UUID") {
			return line
		}
	}
	return ""
}

func parseFirstNonEmptyLine(output string) string {
	for _, line := range strings.Split(output, "\n") {
		line = strings.TrimSpace(line)
		if line != "" {
			return line
		}
	}
	return ""
}

// encryptAESGCM encrypts plaintext with AES-256-GCM.
// Output layout: [12-byte nonce][ciphertext+tag].
func encryptAESGCM(key, plaintext []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
	return ciphertext, nil
}

// decryptAESGCM decrypts data produced by encryptAESGCM.
func decryptAESGCM(key, data []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return nil, fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	return gcm.Open(nil, nonce, ciphertext, nil)
}
