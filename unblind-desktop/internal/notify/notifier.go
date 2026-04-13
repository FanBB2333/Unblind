package notify

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// Notifier handles sending notifications
type Notifier struct {
	httpClient *http.Client
}

// NewNotifier creates a new notifier
func NewNotifier() *Notifier {
	return &Notifier{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// SendBarkNotification sends a notification via Bark API
func (n *Notifier) SendBarkNotification(baseURL, title, body string) error {
	if baseURL == "" {
		return fmt.Errorf("bark base URL is empty")
	}

	// URL encode title and body
	encodedTitle := url.PathEscape(title)
	encodedBody := url.PathEscape(body)

	// Build the Bark API URL
	// Format: https://api.day.app/your-key/title/body
	apiURL := fmt.Sprintf("%s/%s/%s", baseURL, encodedTitle, encodedBody)

	resp, err := n.httpClient.Get(apiURL)
	if err != nil {
		return fmt.Errorf("failed to send bark notification: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("bark API returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// TestBarkNotification sends a test notification
func (n *Notifier) TestBarkNotification(baseURL string) error {
	return n.SendBarkNotification(baseURL, "Unblind 测试通知", "如果你收到这条消息，说明 Bark 通知配置正确！")
}

// NotificationPayload represents a notification to be sent
type NotificationPayload struct {
	Title   string `json:"title"`
	Body    string `json:"body"`
	BarkURL string `json:"barkUrl"`
}

// SendNotification sends a notification using the configured method
func (n *Notifier) SendNotification(payload NotificationPayload) error {
	if payload.BarkURL != "" {
		return n.SendBarkNotification(payload.BarkURL, payload.Title, payload.Body)
	}
	return fmt.Errorf("no notification method configured")
}
