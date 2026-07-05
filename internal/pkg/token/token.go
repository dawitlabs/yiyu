package token

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

func Sign(secret []byte, userID uuid.UUID, purpose string, expiry time.Duration) string {
	exp := time.Now().Add(expiry).Unix()
	payload := fmt.Sprintf("%s:%s:%d", userID, purpose, exp)
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(payload))
	sig := hex.EncodeToString(mac.Sum(nil))
	return base64.URLEncoding.EncodeToString([]byte(fmt.Sprintf("%s:%s", payload, sig)))
}

func Verify(secret []byte, raw string, purpose string) (uuid.UUID, error) {
	data, err := base64.URLEncoding.DecodeString(raw)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid token")
	}

	parts := strings.SplitN(string(data), ":", 4)
	if len(parts) != 4 {
		return uuid.Nil, fmt.Errorf("invalid token")
	}

	uid, err := uuid.Parse(parts[0])
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid token")
	}

	if parts[1] != purpose {
		return uuid.Nil, fmt.Errorf("invalid token")
	}

	var exp int64
	if _, err := fmt.Sscanf(parts[2], "%d", &exp); err != nil {
		return uuid.Nil, fmt.Errorf("invalid token")
	}
	if time.Now().Unix() > exp {
		return uuid.Nil, fmt.Errorf("token expired")
	}

	payload := fmt.Sprintf("%s:%s:%s", parts[0], parts[1], parts[2])
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(payload))
	expectedSig := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(parts[3]), []byte(expectedSig)) {
		return uuid.Nil, fmt.Errorf("invalid token")
	}

	return uid, nil
}

func GenerateRandom() (raw string, hash string, err error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", "", err
	}
	raw = base64.URLEncoding.EncodeToString(b)
	h := sha256.Sum256([]byte(raw))
	return raw, hex.EncodeToString(h[:]), nil
}
