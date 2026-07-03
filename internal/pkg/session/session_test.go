package session

import "testing"

func TestGenerate(t *testing.T) {
	raw, hash, err := Generate()
	if err != nil {
		t.Fatalf("Generate() error = %v", err)
	}
	if raw == "" || hash == "" {
		t.Fatal("Generate() returned an empty raw or hash")
	}
	if raw == hash {
		t.Error("raw and hash should not be equal")
	}

	// Hash must be reproducible from raw — that's how a lookup by cookie
	// value finds the matching session row.
	if got := Hash(raw); got != hash {
		t.Errorf("Hash(raw) = %q, want %q", got, hash)
	}

	raw2, _, err := Generate()
	if err != nil {
		t.Fatalf("Generate() error = %v", err)
	}
	if raw == raw2 {
		t.Error("two calls to Generate() produced the same token")
	}
}
