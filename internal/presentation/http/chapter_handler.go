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

type chapterRepository interface {
	ports.ChapterRepository
	ports.VideoRepository
	ports.ChannelRepository
}

type ChapterHandler struct {
	repo chapterRepository
}

func NewChapterHandler(repo chapterRepository) *ChapterHandler {
	return &ChapterHandler{repo: repo}
}

type chapterResponse struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	StartSeconds int32  `json:"start_seconds"`
}

func toChapterResponse(c repository.VideoChapter) chapterResponse {
	return chapterResponse{
		ID:           c.ID.String(),
		Title:        c.Title,
		StartSeconds: c.StartSeconds,
	}
}

// isVideoOwner reports whether the given user owns the channel a video
// belongs to — shared ownership check for chapter create/delete.
func (h *ChapterHandler) isVideoOwner(r *http.Request, video repository.Video, userID uuid.UUID) bool {
	if !video.ChannelID.Valid {
		return false
	}
	channel, err := h.repo.GetChannelByID(r.Context(), uuid.UUID(video.ChannelID.Bytes))
	if err != nil {
		return false
	}
	return channel.UserID.Valid && channel.UserID.Bytes == userID
}

type createChapterRequest struct {
	Title        string `json:"title"`
	StartSeconds int32  `json:"start_seconds"`
}

func (h *ChapterHandler) CreateChapter(w http.ResponseWriter, r *http.Request) {
	videoID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid video id", http.StatusBadRequest)
		return
	}

	var req createChapterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Title == "" || req.StartSeconds < 0 {
		http.Error(w, "title is required and start_seconds must be >= 0", http.StatusBadRequest)
		return
	}

	video, err := h.repo.GetVideoByID(r.Context(), videoID)
	if err != nil {
		http.Error(w, "video not found", http.StatusNotFound)
		return
	}

	user, _ := UserFromContext(r.Context())
	if !h.isVideoOwner(r, video, user.ID) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	chapter, err := h.repo.CreateChapter(r.Context(), repository.CreateChapterParams{
		VideoID:      pgtype.UUID{Bytes: videoID, Valid: true},
		Title:        req.Title,
		StartSeconds: req.StartSeconds,
	})
	if err != nil {
		slog.Error("create chapter", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, toChapterResponse(chapter))
}

func (h *ChapterHandler) ListChapters(w http.ResponseWriter, r *http.Request) {
	videoID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid video id", http.StatusBadRequest)
		return
	}

	chapters, err := h.repo.ListChaptersByVideo(r.Context(), pgtype.UUID{Bytes: videoID, Valid: true})
	if err != nil {
		slog.Error("list chapters", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	resp := make([]chapterResponse, len(chapters))
	for i, c := range chapters {
		resp[i] = toChapterResponse(c)
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *ChapterHandler) DeleteChapter(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid chapter id", http.StatusBadRequest)
		return
	}

	chapter, err := h.repo.GetChapterByID(r.Context(), id)
	if err != nil {
		http.Error(w, "chapter not found", http.StatusNotFound)
		return
	}
	if !chapter.VideoID.Valid {
		http.Error(w, "chapter not found", http.StatusNotFound)
		return
	}

	video, err := h.repo.GetVideoByID(r.Context(), uuid.UUID(chapter.VideoID.Bytes))
	if err != nil {
		http.Error(w, "video not found", http.StatusNotFound)
		return
	}

	user, _ := UserFromContext(r.Context())
	if !h.isVideoOwner(r, video, user.ID) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.repo.DeleteChapter(r.Context(), id); err != nil {
		slog.Error("delete chapter", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
