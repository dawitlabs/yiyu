package httpapi

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	"github.com/dawitlabs/yiyu/internal/ports"
	"github.com/google/uuid"
)

type endScreenRepository interface {
	ports.EndScreenRepository
	ports.VideoRepository
	ports.ChannelRepository
}

type EndScreenHandler struct {
	repo endScreenRepository
}

func NewEndScreenHandler(repo endScreenRepository) *EndScreenHandler {
	return &EndScreenHandler{repo: repo}
}

type endScreenResponse struct {
	ID           string    `json:"id"`
	VideoID      string    `json:"video_id"`
	Type         string    `json:"type"`
	TargetID     string    `json:"target_id"`
	StartSeconds int32     `json:"start_seconds"`
	PositionX    float32   `json:"position_x"`
	PositionY    float32   `json:"position_y"`
	CreatedAt    time.Time `json:"created_at"`
}

func toEndScreenResponse(e repository.VideoEndScreen) endScreenResponse {
	return endScreenResponse{
		ID:           e.ID.String(),
		VideoID:      e.VideoID.String(),
		Type:         e.Type,
		TargetID:     e.TargetID.String(),
		StartSeconds: e.StartSeconds,
		PositionX:    e.PositionX,
		PositionY:    e.PositionY,
		CreatedAt:    e.CreatedAt.Time,
	}
}

type createEndScreenRequest struct {
	Type         string  `json:"type"`
	TargetID     string  `json:"target_id"`
	StartSeconds int32   `json:"start_seconds"`
	PositionX    float32 `json:"position_x"`
	PositionY    float32 `json:"position_y"`
}

func (h *EndScreenHandler) CreateEndScreen(w http.ResponseWriter, r *http.Request) {
	videoID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid video id", http.StatusBadRequest)
		return
	}

	video, err := h.repo.GetVideoByID(r.Context(), videoID)
	if err != nil {
		http.Error(w, "video not found", http.StatusNotFound)
		return
	}

	user, _ := UserFromContext(r.Context())
	channel, err := h.repo.GetChannelByID(r.Context(), uuid.UUID(video.ChannelID.Bytes))
	if err != nil || !channel.UserID.Valid || channel.UserID.Bytes != user.ID {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var req createEndScreenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	targetID, err := uuid.Parse(req.TargetID)
	if err != nil {
		http.Error(w, "invalid target_id", http.StatusBadRequest)
		return
	}

	switch req.Type {
	case "video", "playlist", "channel", "subscribe":
	default:
		http.Error(w, "type must be one of: video, playlist, channel, subscribe", http.StatusBadRequest)
		return
	}

	es, err := h.repo.CreateEndScreen(r.Context(), repository.CreateEndScreenParams{
		VideoID:      videoID,
		Type:         req.Type,
		TargetID:     targetID,
		StartSeconds: req.StartSeconds,
		PositionX:    req.PositionX,
		PositionY:    req.PositionY,
	})
	if err != nil {
		slog.Error("create end screen", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, toEndScreenResponse(es))
}

func (h *EndScreenHandler) ListEndScreens(w http.ResponseWriter, r *http.Request) {
	videoID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid video id", http.StatusBadRequest)
		return
	}

	screens, err := h.repo.ListEndScreensByVideo(r.Context(), videoID)
	if err != nil {
		slog.Error("list end screens", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	resp := make([]endScreenResponse, len(screens))
	for i, s := range screens {
		resp[i] = toEndScreenResponse(s)
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *EndScreenHandler) DeleteEndScreen(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid end screen id", http.StatusBadRequest)
		return
	}

	es, err := h.repo.GetEndScreenByID(r.Context(), id)
	if err != nil {
		http.Error(w, "end screen not found", http.StatusNotFound)
		return
	}

	video, err := h.repo.GetVideoByID(r.Context(), es.VideoID)
	if err != nil {
		http.Error(w, "video not found", http.StatusNotFound)
		return
	}

	user, _ := UserFromContext(r.Context())
	channel, err := h.repo.GetChannelByID(r.Context(), uuid.UUID(video.ChannelID.Bytes))
	if err != nil || !channel.UserID.Valid || channel.UserID.Bytes != user.ID {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.repo.DeleteEndScreen(r.Context(), id); err != nil {
		slog.Error("delete end screen", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
