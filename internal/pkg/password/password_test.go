package password

import "testing"

func TestHashVerify(t *testing.T) {
	hash, err := Hash("correct-horse-battery-staple")
	if err != nil {
		t.Fatalf("Hash() error = %v", err)
	}

	ok, err := Verify(hash, "correct-horse-battery-staple")
	if err != nil {
		t.Fatalf("Verify() error = %v", err)
	}
	if !ok {
		t.Error("Verify() = false, want true for correct password")
	}

	ok, err = Verify(hash, "wrong-password")
	if err != nil {
		t.Fatalf("Verify() error = %v", err)
	}
	if ok {
		t.Error("Verify() = true, want false for wrong password")
	}
}
