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

type commentRepository interface {
	ports.CommentRepository
	ports.ReportRepository
}

type CommentHandler struct {
	repo commentRepository
}

func NewCommentHandler(repo commentRepository) *CommentHandler {
	return &CommentHandler{repo: repo}
}

type commentAuthorResponse struct {
	ID       string `json:"id"`
	Username string `json:"username"`
}

type commentResponse struct {
	ID        string                `json:"id"`
	Content   string                `json:"content"`
	Author    commentAuthorResponse `json:"author"`
	CreatedAt time.Time             `json:"created_at"`
}

func toCommentResponse(c repository.Comment, author repository.User) commentResponse {
	return commentResponse{
		ID:      c.ID.String(),
		Content: c.Content,
		Author: commentAuthorResponse{
			ID:       author.ID.String(),
			Username: author.Username,
		},
		CreatedAt: c.CreatedAt.Time,
	}
}

type createCommentRequest struct {
	Content string `json:"content"`
}

func (h *CommentHandler) CreateComment(w http.ResponseWriter, r *http.Request) {
	videoID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid video id", http.StatusBadRequest)
		return
	}

	var req createCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Content == "" {
		http.Error(w, "content is required", http.StatusBadRequest)
		return
	}

	user, _ := UserFromContext(r.Context())

	comment, err := h.repo.CreateComment(r.Context(), repository.CreateCommentParams{
		VideoID: pgtype.UUID{Bytes: videoID, Valid: true},
		UserID:  pgtype.UUID{Bytes: user.ID, Valid: true},
		Content: req.Content,
	})
	if err != nil {
		log.Printf("create comment: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, toCommentResponse(comment, user))
}

func (h *CommentHandler) ListCommentsByVideo(w http.ResponseWriter, r *http.Request) {
	videoID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid video id", http.StatusBadRequest)
		return
	}

	limit, offset := parseLimitOffset(r)

	rows, err := h.repo.ListCommentsByVideo(r.Context(), repository.ListCommentsByVideoParams{
		VideoID: pgtype.UUID{Bytes: videoID, Valid: true},
		Limit:   limit,
		Offset:  offset,
	})
	if err != nil {
		log.Printf("list comments: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	resp := make([]commentResponse, len(rows))
	for i, row := range rows {
		resp[i] = toCommentResponse(row.Comment, row.User)
	}

	writeJSON(w, http.StatusOK, resp)
}

// DeleteComment allows either the comment's author or an admin to remove it
// — unlike channel ownership, content moderation needs an admin override.
func (h *CommentHandler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid comment id", http.StatusBadRequest)
		return
	}

	comment, err := h.repo.GetCommentByID(r.Context(), id)
	if err != nil {
		http.Error(w, "comment not found", http.StatusNotFound)
		return
	}

	user, _ := UserFromContext(r.Context())
	isOwner := comment.UserID.Valid && comment.UserID.Bytes == user.ID
	isAdmin := user.Role == repository.UserRoleAdmin
	if !isOwner && !isAdmin {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.repo.DeleteComment(r.Context(), id); err != nil {
		log.Printf("delete comment: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *CommentHandler) ReportComment(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid comment id", http.StatusBadRequest)
		return
	}

	var req reportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Reason == "" {
		http.Error(w, "reason is required", http.StatusBadRequest)
		return
	}

	if _, err := h.repo.GetCommentByID(r.Context(), id); err != nil {
		http.Error(w, "comment not found", http.StatusNotFound)
		return
	}

	user, _ := UserFromContext(r.Context())

	if _, err := h.repo.CreateReport(r.Context(), repository.CreateReportParams{
		ReporterID: pgtype.UUID{Bytes: user.ID, Valid: true},
		CommentID:  pgtype.UUID{Bytes: id, Valid: true},
		Reason:     req.Reason,
	}); err != nil {
		log.Printf("report comment: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
