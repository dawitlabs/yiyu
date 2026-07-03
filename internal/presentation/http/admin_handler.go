package httpapi

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	"github.com/dawitlabs/yiyu/internal/ports"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type adminRepository interface {
	authRepository
	ports.VideoRepository
	ports.ReportRepository
}

type AdminHandler struct {
	repo adminRepository
}

func NewAdminHandler(repo adminRepository) *AdminHandler {
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

func (h *AdminHandler) ListVideos(w http.ResponseWriter, r *http.Request) {
	limit, offset := parseLimitOffset(r)

	videos, err := h.repo.AdminListVideos(r.Context(), repository.AdminListVideosParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		log.Printf("admin: list videos: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	resp := make([]videoResponse, len(videos))
	for i, v := range videos {
		resp[i] = toVideoResponse(v)
	}

	writeJSON(w, http.StatusOK, resp)
}

// DeleteVideo is a hard delete — videos has no soft-delete column the way
// users/comments do, and every child table (comments, video_interactions,
// video_files, watch_history, playlist_videos) already cascades on
// videos.id, so this cleans up correctly without a new schema addition.
func (h *AdminHandler) DeleteVideo(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid video id", http.StatusBadRequest)
		return
	}

	if err := h.repo.AdminDeleteVideo(r.Context(), id); err != nil {
		log.Printf("admin: delete video: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

type adminReportResponse struct {
	ID               string    `json:"id"`
	ReporterUsername string    `json:"reporter_username"`
	VideoID          *string   `json:"video_id"`
	VideoTitle       *string   `json:"video_title"`
	CommentID        *string   `json:"comment_id"`
	CommentContent   *string   `json:"comment_content"`
	Reason           string    `json:"reason"`
	Status           string    `json:"status"`
	CreatedAt        time.Time `json:"created_at"`
}

func toAdminReportResponse(r repository.AdminListReportsRow) adminReportResponse {
	resp := adminReportResponse{
		ID:               r.ID.String(),
		ReporterUsername: r.ReporterUsername,
		Reason:           r.Reason,
		Status:           r.Status.String,
		CreatedAt:        r.CreatedAt.Time,
	}
	if r.VideoID.Valid {
		id := uuid.UUID(r.VideoID.Bytes).String()
		resp.VideoID = &id
	}
	if r.VideoTitle.Valid {
		resp.VideoTitle = &r.VideoTitle.String
	}
	if r.CommentID.Valid {
		id := uuid.UUID(r.CommentID.Bytes).String()
		resp.CommentID = &id
	}
	if r.CommentContent.Valid {
		resp.CommentContent = &r.CommentContent.String
	}
	return resp
}

func (h *AdminHandler) ListReports(w http.ResponseWriter, r *http.Request) {
	limit, offset := parseLimitOffset(r)

	reports, err := h.repo.AdminListReports(r.Context(), repository.AdminListReportsParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		log.Printf("admin: list reports: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	resp := make([]adminReportResponse, len(reports))
	for i, rep := range reports {
		resp[i] = toAdminReportResponse(rep)
	}

	writeJSON(w, http.StatusOK, resp)
}

type updateReportStatusRequest struct {
	Status string `json:"status"`
}

type reportStatusResponse struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

func (h *AdminHandler) UpdateReportStatus(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid report id", http.StatusBadRequest)
		return
	}

	var req updateReportStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	switch req.Status {
	case "pending", "reviewed", "dismissed":
	default:
		http.Error(w, "status must be one of: pending, reviewed, dismissed", http.StatusBadRequest)
		return
	}

	report, err := h.repo.AdminUpdateReportStatus(r.Context(), repository.AdminUpdateReportStatusParams{
		ID:     id,
		Status: pgtype.Text{String: req.Status, Valid: true},
	})
	if err != nil {
		log.Printf("admin: update report status: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, reportStatusResponse{ID: report.ID.String(), Status: report.Status.String})
}
