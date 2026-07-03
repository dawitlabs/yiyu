package httpapi

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	"github.com/dawitlabs/yiyu/internal/ports"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type NotificationHandler struct {
	repo ports.NotificationRepository
}

func NewNotificationHandler(repo ports.NotificationRepository) *NotificationHandler {
	return &NotificationHandler{repo: repo}
}

type notificationResponse struct {
	ID            string    `json:"id"`
	Type          string    `json:"type"`
	ActorUsername *string   `json:"actor_username"`
	VideoID       *string   `json:"video_id"`
	VideoTitle    *string   `json:"video_title"`
	CommentID     *string   `json:"comment_id"`
	IsRead        bool      `json:"is_read"`
	CreatedAt     time.Time `json:"created_at"`
}

func toNotificationResponse(row repository.ListNotificationsRow) notificationResponse {
	resp := notificationResponse{
		ID:        row.ID.String(),
		Type:      row.Type,
		IsRead:    row.IsRead.Bool,
		CreatedAt: row.CreatedAt.Time,
	}
	if row.ActorUsername.Valid {
		resp.ActorUsername = &row.ActorUsername.String
	}
	if row.VideoID.Valid {
		id := uuid.UUID(row.VideoID.Bytes).String()
		resp.VideoID = &id
	}
	if row.VideoTitle.Valid {
		resp.VideoTitle = &row.VideoTitle.String
	}
	if row.CommentID.Valid {
		id := uuid.UUID(row.CommentID.Bytes).String()
		resp.CommentID = &id
	}
	return resp
}

func (h *NotificationHandler) ListNotifications(w http.ResponseWriter, r *http.Request) {
	user, _ := UserFromContext(r.Context())
	limit, offset := parseLimitOffset(r)

	rows, err := h.repo.ListNotifications(r.Context(), repository.ListNotificationsParams{
		UserID: pgtype.UUID{Bytes: user.ID, Valid: true},
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		slog.Error("list notifications", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	resp := make([]notificationResponse, len(rows))
	for i, row := range rows {
		resp[i] = toNotificationResponse(row)
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *NotificationHandler) UnreadCount(w http.ResponseWriter, r *http.Request) {
	user, _ := UserFromContext(r.Context())

	count, err := h.repo.CountUnreadNotifications(r.Context(), pgtype.UUID{Bytes: user.ID, Valid: true})
	if err != nil {
		slog.Error("count unread notifications", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, map[string]int64{"count": count})
}

func (h *NotificationHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid notification id", http.StatusBadRequest)
		return
	}

	user, _ := UserFromContext(r.Context())

	if _, err := h.repo.MarkNotificationRead(r.Context(), repository.MarkNotificationReadParams{
		ID:     id,
		UserID: pgtype.UUID{Bytes: user.ID, Valid: true},
	}); err != nil {
		http.Error(w, "notification not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
