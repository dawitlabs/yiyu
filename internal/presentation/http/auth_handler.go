package httpapi

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	"github.com/dawitlabs/yiyu/internal/pkg/email"
	"github.com/dawitlabs/yiyu/internal/pkg/password"
	"github.com/dawitlabs/yiyu/internal/pkg/session"
	"github.com/dawitlabs/yiyu/internal/pkg/token"
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
	ports.PasswordResetRepository
}

type AuthHandler struct {
	repo      authRepository
	email     *email.Client
	secret    []byte
	baseURL   string
}

func NewAuthHandler(repo authRepository, emailClient *email.Client, secret []byte, baseURL string) *AuthHandler {
	return &AuthHandler{repo: repo, email: emailClient, secret: secret, baseURL: baseURL}
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
	ID            string `json:"id"`
	Username      string `json:"username"`
	Email         string `json:"email"`
	Role          string `json:"role"`
	EmailVerified bool   `json:"email_verified"`
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
		slog.Error("signup: hash password", "error", err)
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
		slog.Error("signup: create user", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	if err := h.startSession(w, r, user.ID); err != nil {
		slog.Error("sign up start session", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	go h.sendVerificationEmail(user.Email, user.ID)

	writeJSON(w, http.StatusCreated, toUserResponse(user))
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
		slog.Error("login: start session", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, toUserResponse(user))
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	writeJSON(w, http.StatusOK, toUserResponse(user))
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(sessionCookieName); err == nil {
		if err := h.repo.DeleteSession(r.Context(), session.Hash(cookie.Value)); err != nil {
			slog.Error("logout: delete session", "error", err)
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

func toUserResponse(u repository.User) userResponse {
	return userResponse{
		ID:            u.ID.String(),
		Username:      u.Username,
		Email:         u.Email,
		Role:          string(u.Role),
		EmailVerified: u.EmailVerifiedAt.Valid,
	}
}

func (h *AuthHandler) sendVerificationEmail(userEmail string, userID uuid.UUID) {
	if h.email == nil {
		return
	}
	tok := token.Sign(h.secret, userID, "verify-email", 24*time.Hour)
	link := h.baseURL + "/verify-email?token=" + tok
	html := "<p>Verify your yiyu account:</p><p><a href=\"" + link + "\">Verify Email</a></p>"
	if err := h.email.Send(userEmail, "Verify your yiyu email", html); err != nil {
		slog.Error("send verification email", "error", err)
	}
}

func (h *AuthHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	tok := r.URL.Query().Get("token")
	if tok == "" {
		http.Error(w, "token is required", http.StatusBadRequest)
		return
	}

	uid, err := token.Verify(h.secret, tok, "verify-email")
	if err != nil {
		http.Error(w, "invalid or expired token", http.StatusBadRequest)
		return
	}

	if err := h.repo.VerifyUserEmail(r.Context(), uid); err != nil {
		slog.Error("verify email", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "verified"})
}

func (h *AuthHandler) ResendVerification(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	if user.EmailVerifiedAt.Valid {
		http.Error(w, "email already verified", http.StatusBadRequest)
		return
	}
	go h.sendVerificationEmail(user.Email, user.ID)
	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" {
		http.Error(w, "email is required", http.StatusBadRequest)
		return
	}

	// Always return 204 to prevent email enumeration.
	w.WriteHeader(http.StatusNoContent)

	user, err := h.repo.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		return
	}

	if h.email == nil {
		return
	}

	raw, hash, err := token.GenerateRandom()
	if err != nil {
		slog.Error("generate reset token", "error", err)
		return
	}

	_, err = h.repo.CreatePasswordResetToken(r.Context(), repository.CreatePasswordResetTokenParams{
		UserID:    user.ID,
		TokenHash: hash,
		ExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(1 * time.Hour), Valid: true},
	})
	if err != nil {
		slog.Error("create reset token", "error", err)
		return
	}

	link := h.baseURL + "/reset-password?token=" + raw
	html := "<p>Reset your yiyu password:</p><p><a href=\"" + link + "\">Reset Password</a></p><p>This link expires in 1 hour.</p>"
	if err := h.email.Send(user.Email, "Reset your yiyu password", html); err != nil {
		slog.Error("send reset email", "error", err)
	}
}

func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Token == "" || req.Password == "" {
		http.Error(w, "token and password are required", http.StatusBadRequest)
		return
	}

	hash := session.Hash(req.Token)
	resetToken, err := h.repo.GetPasswordResetToken(r.Context(), hash)
	if err != nil {
		http.Error(w, "invalid or expired token", http.StatusBadRequest)
		return
	}

	pwHash, err := password.Hash(req.Password)
	if err != nil {
		slog.Error("reset password: hash", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	if err := h.repo.UpdateUserPassword(r.Context(), repository.UpdateUserPasswordParams{
		ID:           resetToken.UserID,
		PasswordHash: pwHash,
	}); err != nil {
		slog.Error("reset password: update", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	_ = h.repo.UsePasswordResetToken(r.Context(), resetToken.ID)
	_ = h.repo.DeleteUserSessions(r.Context(), resetToken.UserID)

	writeJSON(w, http.StatusOK, map[string]string{"status": "password_reset"})
}
