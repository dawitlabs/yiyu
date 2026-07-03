package httpapi

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	"github.com/dawitlabs/yiyu/internal/ports"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type WatchHistoryHandler struct {
	repo ports.WatchHistoryRepository
}

func NewWatchHistoryHandler(repo ports.WatchHistoryRepository) *WatchHistoryHandler {
	return &WatchHistoryHandler{repo: repo}
}

type recordProgressRequest struct {
	Progress  int32 `json:"progress"`
	Completed bool  `json:"completed"`
}

func (h *WatchHistoryHandler) RecordProgress(w http.ResponseWriter, r *http.Request) {
	videoID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid video id", http.StatusBadRequest)
		return
	}

	var req recordProgressRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	user, _ := UserFromContext(r.Context())

	if _, err := h.repo.UpsertWatchHistory(r.Context(), repository.UpsertWatchHistoryParams{
		UserID:    pgtype.UUID{Bytes: user.ID, Valid: true},
		VideoID:   pgtype.UUID{Bytes: videoID, Valid: true},
		Progress:  pgtype.Int4{Int32: req.Progress, Valid: true},
		Completed: pgtype.Bool{Bool: req.Completed, Valid: true},
	}); err != nil {
		slog.Error("record watch progress", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *WatchHistoryHandler) ListHistory(w http.ResponseWriter, r *http.Request) {
	user, _ := UserFromContext(r.Context())
	limit, offset := parseLimitOffset(r)

	videos, err := h.repo.ListWatchHistory(r.Context(), repository.ListWatchHistoryParams{
		UserID: pgtype.UUID{Bytes: user.ID, Valid: true},
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		slog.Error("list watch history", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	resp := make([]videoResponse, len(videos))
	for i, v := range videos {
		resp[i] = toVideoResponse(v)
	}

	writeJSON(w, http.StatusOK, resp)
}
