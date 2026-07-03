package httpapi

import (
	"context"
	"net/http"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	"github.com/dawitlabs/yiyu/internal/pkg/session"
)

type contextKey int

const userContextKey contextKey = iota

func UserFromContext(ctx context.Context) (repository.User, bool) {
	user, ok := ctx.Value(userContextKey).(repository.User)
	return user, ok
}

func RequireAuth(repo authRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie(sessionCookieName)
			if err != nil {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			row, err := repo.GetSessionWithUser(r.Context(), session.Hash(cookie.Value))
			if err != nil {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), userContextKey, row.User)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
