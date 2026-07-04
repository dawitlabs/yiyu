package main

import "testing"

func TestRenditionsFor(t *testing.T) {
	cases := []struct {
		sourceHeight int
		want         []string
	}{
		{1080, []string{"1080p", "720p", "480p"}},
		{720, []string{"720p", "480p"}},
		{600, []string{"480p"}},
		{240, []string{"480p"}}, // below the smallest rung: floor to it, no upscaling attempted
	}

	for _, c := range cases {
		got := renditionsFor(c.sourceHeight)
		if len(got) != len(c.want) {
			t.Fatalf("renditionsFor(%d): got %d renditions, want %d (%v)", c.sourceHeight, len(got), len(c.want), got)
		}
		for i, name := range c.want {
			if got[i].name != name {
				t.Errorf("renditionsFor(%d)[%d] = %q, want %q", c.sourceHeight, i, got[i].name, name)
			}
			if got[i].height > c.sourceHeight && c.sourceHeight >= renditionLadder[len(renditionLadder)-1].height {
				t.Errorf("renditionsFor(%d) picked %dp, which upscales", c.sourceHeight, got[i].height)
			}
		}
	}
}
