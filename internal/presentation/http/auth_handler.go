package httpapi

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	"github.com/dawitlabs/yiyu/internal/pkg/password"
	"github.com/dawitlabs/yiyu/internal/pkg/session"
	"github.com/dawitlabs/yiyu/internal/ports"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

const (
	sessionCookieName     = "session"
	sessionCookieDuration = 30 * 24 * time.Hour
)

// authRepository is the slice of ports.Repository that auth actually calls —
// defined here, at the point of use, rather than depending on the whole
// Repository interface (which also pulls in video methods this handler
// never touches).
type authRepository interface {
	ports.UserRepository
	ports.SessionRepository
}

type AuthHandler struct {
	repo authRepository
}

func NewAuthHandler(repo authRepository) *AuthHandler {
	return &AuthHandler{repo: repo}
}

type signUpRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type userResponse struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

func (h *AuthHandler) Signup(w http.ResponseWriter, r *http.Request) {
	var req signUpRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Username == "" || req.Email == "" || req.Password == "" {
		http.Error(w, "username, email and password are required", http.StatusBadRequest)
		return
	}

	hash, err := password.Hash(req.Password)
	if err != nil {
		log.Printf("signup: hash password: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	user, err := h.repo.CreateUser(r.Context(), repository.CreateUserParams{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: hash,
		Role:         repository.UserRoleUser,
	})

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			http.Error(w, "username or email is aready taken", http.StatusConflict)
			return

		}
		log.Printf("signup: create user: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	if err := h.startSession(w, r, user.ID); err != nil {
		log.Printf("sign up start session: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, userResponse{
		ID:       user.ID.String(),
		Username: user.Username,
		Email:    user.Email,
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	user, err := h.repo.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		// Same response whether the email doesn't exist or the password is
		// wrong — don't let this endpoint be used to enumerate accounts.
		http.Error(w, "invalid email or password", http.StatusUnauthorized)
		return
	}

	ok, err := password.Verify(user.PasswordHash, req.Password)
	if err != nil || !ok {
		http.Error(w, "invalid email or password", http.StatusUnauthorized)
		return
	}

	if err := h.startSession(w, r, user.ID); err != nil {
		log.Printf("login: start session: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, userResponse{
		ID:       user.ID.String(),
		Username: user.Username,
		Email:    user.Email,
	})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	writeJSON(w, http.StatusOK, userResponse{
		ID:       user.ID.String(),
		Username: user.Username,
		Email:    user.Email,
	})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(sessionCookieName); err == nil {
		if err := h.repo.DeleteSession(r.Context(), session.Hash(cookie.Value)); err != nil {
			log.Printf("logout: delete session: %v", err)
		}
	}

	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandler) startSession(w http.ResponseWriter, r *http.Request, userID uuid.UUID) error {
	raw, hash, err := session.Generate()
	if err != nil {
		return err
	}

	expiresAt := time.Now().Add(sessionCookieDuration)
	_, err = h.repo.CreateSession(r.Context(), repository.CreateSessionParams{
		TokenHash: hash,
		UserID:    userID,
		ExpiresAt: pgtype.Timestamptz{Time: expiresAt, Valid: true},
	})
	if err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    raw,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})
	return nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
