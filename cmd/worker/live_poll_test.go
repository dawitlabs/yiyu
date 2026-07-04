package main

import "testing"

func TestStreamKeyFromPath(t *testing.T) {
	cases := map[string]string{
		"live/abc123":     "abc123",
		"abc123":          "abc123",
		"live/nested/key": "key",
		"":                "",
	}

	for path, want := range cases {
		if got := streamKeyFromPath(path); got != want {
			t.Errorf("streamKeyFromPath(%q) = %q, want %q", path, got, want)
		}
	}
}
