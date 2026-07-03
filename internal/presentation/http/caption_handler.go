package httpapi

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	"github.com/dawitlabs/yiyu/internal/ports"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type captionRepository interface {
	ports.CaptionRepository
	ports.VideoRepository
	ports.ChannelRepository
}

type CaptionHandler struct {
	repo captionRepository
}

func NewCaptionHandler(repo captionRepository) *CaptionHandler {
	return &CaptionHandler{repo: repo}
}

type captionResponse struct {
	ID        string    `json:"id"`
	Language  string    `json:"language"`
	Label     string    `json:"label"`
	Url       string    `json:"url"`
	IsDefault bool      `json:"is_default"`
	CreatedAt time.Time `json:"created_at"`
}

func toCaptionResponse(c repository.VideoCaption) captionResponse {
	return captionResponse{
		ID:        c.ID.String(),
		Language:  c.Language,
		Label:     c.Label,
		Url:       c.Url,
		IsDefault: c.IsDefault.Bool,
		CreatedAt: c.CreatedAt.Time,
	}
}

// isVideoOwner reports whether the given user owns the channel a video
// belongs to — shared ownership check for caption create/delete.
func (h *CaptionHandler) isVideoOwner(r *http.Request, video repository.Video, userID uuid.UUID) bool {
	if !video.ChannelID.Valid {
		return false
	}
	channel, err := h.repo.GetChannelByID(r.Context(), uuid.UUID(video.ChannelID.Bytes))
	if err != nil {
		return false
	}
	return channel.UserID.Valid && channel.UserID.Bytes == userID
}

type createCaptionRequest struct {
	Language  string `json:"language"`
	Label     string `json:"label"`
	Url       string `json:"url"`
	IsDefault bool   `json:"is_default"`
}

func (h *CaptionHandler) CreateCaption(w http.ResponseWriter, r *http.Request) {
	videoID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid video id", http.StatusBadRequest)
		return
	}

	var req createCaptionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Language == "" || req.Label == "" || req.Url == "" {
		http.Error(w, "language, label, and url are required", http.StatusBadRequest)
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

	caption, err := h.repo.CreateCaption(r.Context(), repository.CreateCaptionParams{
		VideoID:   pgtype.UUID{Bytes: videoID, Valid: true},
		Language:  req.Language,
		Label:     req.Label,
		Url:       req.Url,
		IsDefault: pgtype.Bool{Bool: req.IsDefault, Valid: true},
	})
	if err != nil {
		slog.Error("create caption", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, toCaptionResponse(caption))
}

func (h *CaptionHandler) ListCaptions(w http.ResponseWriter, r *http.Request) {
	videoID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid video id", http.StatusBadRequest)
		return
	}

	captions, err := h.repo.ListCaptionsByVideo(r.Context(), pgtype.UUID{Bytes: videoID, Valid: true})
	if err != nil {
		slog.Error("list captions", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	resp := make([]captionResponse, len(captions))
	for i, c := range captions {
		resp[i] = toCaptionResponse(c)
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *CaptionHandler) DeleteCaption(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid caption id", http.StatusBadRequest)
		return
	}

	caption, err := h.repo.GetCaptionByID(r.Context(), id)
	if err != nil {
		http.Error(w, "caption not found", http.StatusNotFound)
		return
	}
	if !caption.VideoID.Valid {
		http.Error(w, "caption not found", http.StatusNotFound)
		return
	}

	video, err := h.repo.GetVideoByID(r.Context(), uuid.UUID(caption.VideoID.Bytes))
	if err != nil {
		http.Error(w, "video not found", http.StatusNotFound)
		return
	}

	user, _ := UserFromContext(r.Context())
	if !h.isVideoOwner(r, video, user.ID) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.repo.DeleteCaption(r.Context(), id); err != nil {
		slog.Error("delete caption", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
