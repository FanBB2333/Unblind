package credentials

import "testing"

func TestParseWindowsRegistryMachineID(t *testing.T) {
	output := `

HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography
    MachineGuid    REG_SZ    12345678-90ab-cdef-1234-567890abcdef
`

	got := parseWindowsRegistryMachineID(output)
	want := "12345678-90ab-cdef-1234-567890abcdef"
	if got != want {
		t.Fatalf("parseWindowsRegistryMachineID() = %q, want %q", got, want)
	}
}

func TestParseWindowsWMIUUID(t *testing.T) {
	output := "UUID\r\n4C4C4544-0033-3710-8058-B6C04F4B5332\r\n\r\n"

	got := parseWindowsWMIUUID(output)
	want := "4C4C4544-0033-3710-8058-B6C04F4B5332"
	if got != want {
		t.Fatalf("parseWindowsWMIUUID() = %q, want %q", got, want)
	}
}

func TestParseFirstNonEmptyLine(t *testing.T) {
	output := "\n \nabc-def\nxyz\n"

	got := parseFirstNonEmptyLine(output)
	want := "abc-def"
	if got != want {
		t.Fatalf("parseFirstNonEmptyLine() = %q, want %q", got, want)
	}
}
