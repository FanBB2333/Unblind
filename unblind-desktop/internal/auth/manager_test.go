package auth

import (
	"net/url"
	"testing"
)

func TestLoginEntryURLTargetsProtectedPage(t *testing.T) {
	got := loginEntryURL()

	parsed, err := url.Parse(got)
	if err != nil {
		t.Fatalf("loginEntryURL() returned invalid URL %q: %v", got, err)
	}

	if base := parsed.Scheme + "://" + parsed.Host + parsed.Path; base != LoginURL {
		t.Fatalf("loginEntryURL() base URL = %q, want %q", base, LoginURL)
	}

	if service := parsed.Query().Get("service"); service != TargetURL {
		t.Fatalf("loginEntryURL() service = %q, want %q", service, TargetURL)
	}
}

func TestIsAuthenticatedTargetURL(t *testing.T) {
	tests := []struct {
		name string
		url  string
		want bool
	}{
		{
			name: "target page after login",
			url:  TargetURL,
			want: true,
		},
		{
			name: "plain cas login page",
			url:  LoginURL,
			want: false,
		},
		{
			name: "cas redirect with service param",
			url:  LoginURL + "?service=https%3A%2F%2Fyjsy.zju.edu.cn%2Fdashboard%2Fworkplace%3Fdm%3Dxw_sqzt",
			want: false,
		},
		{
			name: "other yjsy page without target marker",
			url:  "https://yjsy.zju.edu.cn/dashboard/home",
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isAuthenticatedTargetURL(tt.url); got != tt.want {
				t.Fatalf("isAuthenticatedTargetURL(%q) = %v, want %v", tt.url, got, tt.want)
			}
		})
	}
}
