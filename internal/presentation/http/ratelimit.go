package httpapi

import (
	"net"
	"net/http"
	"sync"
	"time"
)

type bucket struct {
	tokens   float64
	lastSeen time.Time
}

// ipRateLimiter is a per-IP token bucket. Buckets are evicted lazily by a
// background sweep so memory doesn't grow forever as new IPs show up.
type ipRateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*bucket
	rate    float64 // tokens added per second
	burst   float64 // bucket capacity
}

func newIPRateLimiter(perMinute, burst int) *ipRateLimiter {
	rl := &ipRateLimiter{
		buckets: make(map[string]*bucket),
		rate:    float64(perMinute) / 60,
		burst:   float64(burst),
	}
	go rl.sweep()
	return rl
}

// sweep drops buckets that haven't been touched in a while — otherwise
// every distinct IP that ever hits the server stays in memory forever.
func (rl *ipRateLimiter) sweep() {
	for range time.Tick(10 * time.Minute) {
		cutoff := time.Now().Add(-10 * time.Minute)
		rl.mu.Lock()
		for ip, b := range rl.buckets {
			if b.lastSeen.Before(cutoff) {
				delete(rl.buckets, ip)
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *ipRateLimiter) allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	b, ok := rl.buckets[key]
	if !ok {
		rl.buckets[key] = &bucket{tokens: rl.burst - 1, lastSeen: now}
		return true
	}

	elapsed := now.Sub(b.lastSeen).Seconds()
	b.tokens = min(b.tokens+elapsed*rl.rate, rl.burst)
	b.lastSeen = now

	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}

func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// RateLimit caps requests per client IP — perMinute is the sustained rate,
// burst is how many requests can land back-to-back before throttling kicks
// in. Each call creates an independent limiter, so a strict one (e.g. for
// /login) and a general one (for everything else) don't share a budget.
func RateLimit(perMinute, burst int) func(http.Handler) http.Handler {
	rl := newIPRateLimiter(perMinute, burst)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !rl.allow(clientIP(r)) {
				http.Error(w, "too many requests", http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
