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

type playlistRepository interface {
	ports.PlaylistRepository
	ports.ChannelRepository
	ports.VideoRepository
}

type PlaylistHandler struct {
	repo playlistRepository
}

func NewPlaylistHandler(repo playlistRepository) *PlaylistHandler {
	return &PlaylistHandler{repo: repo}
}

type playlistResponse struct {
	ID          string    `json:"id"`
	ChannelID   string    `json:"channel_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	IsPublic    bool      `json:"is_public"`
	CreatedAt   time.Time `json:"created_at"`
}

func toPlaylistResponse(p repository.Playlist) playlistResponse {
	return playlistResponse{
		ID:          p.ID.String(),
		ChannelID:   uuid.UUID(p.ChannelID.Bytes).String(),
		Name:        p.Name,
		Description: p.Description.String,
		IsPublic:    p.IsPublic.Bool,
		CreatedAt:   p.CreatedAt.Time,
	}
}

// isPlaylistOwner reports whether the given user owns the channel a
// playlist belongs to.
func (h *PlaylistHandler) isPlaylistOwner(r *http.Request, playlist repository.Playlist, userID uuid.UUID) bool {
	if !playlist.ChannelID.Valid {
		return false
	}
	channel, err := h.repo.GetChannelByID(r.Context(), uuid.UUID(playlist.ChannelID.Bytes))
	if err != nil {
		return false
	}
	return channel.UserID.Valid && channel.UserID.Bytes == userID
}

type createPlaylistRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	IsPublic    *bool  `json:"is_public"`
}

func (h *PlaylistHandler) CreatePlaylist(w http.ResponseWriter, r *http.Request) {
	var req createPlaylistRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}
	isPublic := true
	if req.IsPublic != nil {
		isPublic = *req.IsPublic
	}

	user, _ := UserFromContext(r.Context())
	channel, err := h.repo.GetChannelByUserID(r.Context(), pgtype.UUID{Bytes: user.ID, Valid: true})
	if err != nil {
		http.Error(w, "create a channel before creating a playlist", http.StatusBadRequest)
		return
	}

	playlist, err := h.repo.CreatePlaylist(r.Context(), repository.CreatePlaylistParams{
		ChannelID:   pgtype.UUID{Bytes: channel.ID, Valid: true},
		Name:        req.Name,
		Description: pgtype.Text{String: req.Description, Valid: req.Description != ""},
		IsPublic:    pgtype.Bool{Bool: isPublic, Valid: true},
	})
	if err != nil {
		log.Printf("create playlist: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, toPlaylistResponse(playlist))
}

func (h *PlaylistHandler) ListPlaylistsByChannel(w http.ResponseWriter, r *http.Request) {
	channel, err := h.repo.GetChannelByHandle(r.Context(), r.PathValue("handle"))
	if err != nil {
		http.Error(w, "channel not found", http.StatusNotFound)
		return
	}

	limit, offset := parseLimitOffset(r)

	isOwner := false
	if user, ok := UserFromContext(r.Context()); ok {
		isOwner = channel.UserID.Valid && channel.UserID.Bytes == user.ID
	}

	var playlists []repository.Playlist
	if isOwner {
		// The owner sees their private playlists too — this is the one
		// listing endpoint the "add to playlist" picker uses, and it needs
		// to offer private playlists as a destination, not just public ones.
		playlists, err = h.repo.ListAllPlaylistsByChannel(r.Context(), repository.ListAllPlaylistsByChannelParams{
			ChannelID: pgtype.UUID{Bytes: channel.ID, Valid: true},
			Limit:     limit,
			Offset:    offset,
		})
	} else {
		playlists, err = h.repo.ListPlaylistsByChannel(r.Context(), repository.ListPlaylistsByChannelParams{
			ChannelID: pgtype.UUID{Bytes: channel.ID, Valid: true},
			Limit:     limit,
			Offset:    offset,
		})
	}
	if err != nil {
		log.Printf("list playlists: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	resp := make([]playlistResponse, len(playlists))
	for i, p := range playlists {
		resp[i] = toPlaylistResponse(p)
	}

	writeJSON(w, http.StatusOK, resp)
}

type playlistWithVideosResponse struct {
	playlistResponse
	Videos []videoResponse `json:"videos"`
}

func (h *PlaylistHandler) GetPlaylist(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid playlist id", http.StatusBadRequest)
		return
	}

	playlist, err := h.repo.GetPlaylistByID(r.Context(), id)
	if err != nil {
		http.Error(w, "playlist not found", http.StatusNotFound)
		return
	}

	if !playlist.IsPublic.Bool {
		user, ok := UserFromContext(r.Context())
		if !ok || !h.isPlaylistOwner(r, playlist, user.ID) {
			http.Error(w, "playlist not found", http.StatusNotFound)
			return
		}
	}

	videos, err := h.repo.ListPlaylistVideos(r.Context(), id)
	if err != nil {
		log.Printf("list playlist videos: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	videoResps := make([]videoResponse, len(videos))
	for i, v := range videos {
		videoResps[i] = toVideoResponse(v)
	}

	writeJSON(w, http.StatusOK, playlistWithVideosResponse{
		playlistResponse: toPlaylistResponse(playlist),
		Videos:           videoResps,
	})
}

func (h *PlaylistHandler) DeletePlaylist(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid playlist id", http.StatusBadRequest)
		return
	}

	playlist, err := h.repo.GetPlaylistByID(r.Context(), id)
	if err != nil {
		http.Error(w, "playlist not found", http.StatusNotFound)
		return
	}

	user, _ := UserFromContext(r.Context())
	if !h.isPlaylistOwner(r, playlist, user.ID) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.repo.DeletePlaylist(r.Context(), id); err != nil {
		log.Printf("delete playlist: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

type addPlaylistVideoRequest struct {
	VideoID string `json:"video_id"`
}

func (h *PlaylistHandler) AddVideo(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid playlist id", http.StatusBadRequest)
		return
	}

	var req addPlaylistVideoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	videoID, err := uuid.Parse(req.VideoID)
	if err != nil {
		http.Error(w, "invalid video_id", http.StatusBadRequest)
		return
	}

	playlist, err := h.repo.GetPlaylistByID(r.Context(), id)
	if err != nil {
		http.Error(w, "playlist not found", http.StatusNotFound)
		return
	}

	user, _ := UserFromContext(r.Context())
	if !h.isPlaylistOwner(r, playlist, user.ID) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if _, err := h.repo.GetVideoByID(r.Context(), videoID); err != nil {
		http.Error(w, "video not found", http.StatusNotFound)
		return
	}

	if _, err := h.repo.AddVideoToPlaylist(r.Context(), repository.AddVideoToPlaylistParams{
		PlaylistID: id,
		VideoID:    videoID,
	}); err != nil {
		log.Printf("add video to playlist: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *PlaylistHandler) RemoveVideo(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid playlist id", http.StatusBadRequest)
		return
	}
	videoID, err := uuid.Parse(r.PathValue("videoId"))
	if err != nil {
		http.Error(w, "invalid video id", http.StatusBadRequest)
		return
	}

	playlist, err := h.repo.GetPlaylistByID(r.Context(), id)
	if err != nil {
		http.Error(w, "playlist not found", http.StatusNotFound)
		return
	}

	user, _ := UserFromContext(r.Context())
	if !h.isPlaylistOwner(r, playlist, user.ID) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.repo.RemoveVideoFromPlaylist(r.Context(), repository.RemoveVideoFromPlaylistParams{
		PlaylistID: id,
		VideoID:    videoID,
	}); err != nil {
		log.Printf("remove video from playlist: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
