package httpapi

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type AdminHandler struct {
	repo authRepository
}

func NewAdminHandler(repo authRepository) *AdminHandler {
	return &AdminHandler{repo: repo}
}

type adminUserResponse struct {
	ID        string    `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

func toAdminUserResponse(u repository.User) adminUserResponse {
	return adminUserResponse{
		ID:        u.ID.String(),
		Username:  u.Username,
		Email:     u.Email,
		Role:      string(u.Role),
		IsActive:  u.IsActive.Bool,
		CreatedAt: u.CreatedAt.Time,
	}
}

func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	limit, offset := parseLimitOffset(r)

	users, err := h.repo.AdminGetAllUsers(r.Context(), repository.AdminGetAllUsersParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		log.Printf("admin: list users: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	resp := make([]adminUserResponse, len(users))
	for i, u := range users {
		resp[i] = toAdminUserResponse(u)
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *AdminHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid user id", http.StatusBadRequest)
		return
	}

	admin, _ := UserFromContext(r.Context())

	if err := h.repo.AdminDeleteUser(r.Context(), repository.AdminDeleteUserParams{
		ID:        id,
		DeletedBy: pgtype.UUID{Bytes: admin.ID, Valid: true},
	}); err != nil {
		log.Printf("admin: delete user: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// Ban takes effect immediately, not after the token happens to expire.
	if err := h.repo.DeleteUserSessions(r.Context(), id); err != nil {
		log.Printf("admin: delete user sessions: %v", err)
	}

	w.WriteHeader(http.StatusNoContent)
}

type updateUserRoleRequest struct {
	Role string `json:"role"`
}

func (h *AdminHandler) UpdateUserRole(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid user id", http.StatusBadRequest)
		return
	}

	var req updateUserRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	role := repository.UserRole(req.Role)
	switch role {
	case repository.UserRoleUser, repository.UserRoleAdmin, repository.UserRoleModerator:
	default:
		http.Error(w, "role must be one of: user, admin, moderator", http.StatusBadRequest)
		return
	}

	user, err := h.repo.AdminUpdateUserRole(r.Context(), repository.AdminUpdateUserRoleParams{
		ID:   id,
		Role: role,
	})
	if err != nil {
		log.Printf("admin: update user role: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, toAdminUserResponse(user))
}
