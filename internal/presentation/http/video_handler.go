package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	"github.com/dawitlabs/yiyu/internal/ports"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// videoRepository is the slice of ports this handler needs — channel lookups
// to resolve a handle/owner, the video methods themselves, and WithTx for
// like/dislike, which touches two tables atomically.
type videoRepository interface {
	ports.VideoRepository
	ports.ChannelRepository
	ports.ReportRepository
	WithTx(ctx context.Context, fn func(repository.Querier) error) error
}

// reportRequest is shared between VideoHandler.ReportVideo and
// CommentHandler.ReportComment.
type reportRequest struct {
	Reason string `json:"reason"`
}

type VideoHandler struct {
	repo videoRepository
}

func NewVideoHandler(repo videoRepository) *VideoHandler {
	return &VideoHandler{repo: repo}
}

type videoResponse struct {
	ID             string    `json:"id"`
	ChannelID      string    `json:"channel_id"`
	ChannelName    string    `json:"channel_name"`
	ChannelHandle  string    `json:"channel_handle"`
	Title          string    `json:"title"`
	Description    string    `json:"description"`
	Status         string    `json:"status"`
	Visibility     string    `json:"visibility"`
	ViewsCount     int64     `json:"views_count"`
	LikesCount     int64     `json:"likes_count"`
	DislikesCount  int64     `json:"dislikes_count"`
	ThumbnailUrl   string    `json:"thumbnail_url"`
	OriginalUrl    string    `json:"original_url"`
	HlsPlaylistUrl string    `json:"hls_playlist_url"`
	Category       string    `json:"category"`
	Tags           []string  `json:"tags"`
	Duration       int32     `json:"duration"`
	UploadedAt     time.Time `json:"uploaded_at"`
}

// toVideoResponse takes the video's channel alongside it — every video card
// in the UI needs to show and link to who posted it, so the channel isn't
// optional context here the way it might be on, say, a moderation queue.
func toVideoResponse(v repository.Video, channel repository.Channel) videoResponse {
	return videoResponse{
		ID:             v.ID.String(),
		ChannelID:      uuid.UUID(v.ChannelID.Bytes).String(),
		ChannelName:    channel.Name,
		ChannelHandle:  channel.Handle,
		Title:          v.Title,
		Description:    v.Description.String,
		Status:         v.Status,
		Visibility:     v.Visibility,
		ViewsCount:     v.ViewsCount.Int64,
		LikesCount:     v.LikesCount.Int64,
		DislikesCount:  v.DislikesCount.Int64,
		ThumbnailUrl:   v.ThumbnailUrl.String,
		OriginalUrl:    v.OriginalUrl.String,
		HlsPlaylistUrl: v.HlsPlaylistUrl.String,
		Category:       v.Category.String,
		Tags:           v.Tags,
		Duration:       v.Duration.Int32,
		UploadedAt:     v.UploadedAt.Time,
	}
}

// toVideoResponses batches one GetChannelsByIDs call for a whole list
// instead of one channel lookup per video, for endpoints whose videos can
// span many different channels (feeds, search, related).
func toVideoResponses(ctx context.Context, repo ports.ChannelRepository, videos []repository.Video) []videoResponse {
	seen := make(map[uuid.UUID]bool, len(videos))
	ids := make([]uuid.UUID, 0, len(videos))
	for _, v := range videos {
		id := uuid.UUID(v.ChannelID.Bytes)
		if v.ChannelID.Valid && !seen[id] {
			seen[id] = true
			ids = append(ids, id)
		}
	}

	channels := make(map[uuid.UUID]repository.Channel, len(ids))
	if len(ids) > 0 {
		rows, err := repo.GetChannelsByIDs(ctx, ids)
		if err != nil {
			slog.Error("get channels by ids", "error", err)
		}
		for _, c := range rows {
			channels[c.ID] = c
		}
	}

	resp := make([]videoResponse, len(videos))
	for i, v := range videos {
		resp[i] = toVideoResponse(v, channels[uuid.UUID(v.ChannelID.Bytes)])
	}
	return resp
}

type createVideoRequest struct {
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	OriginalUrl  string   `json:"original_url"`
	ThumbnailUrl string   `json:"thumbnail_url"`
	Category     string   `json:"category"`
	Tags         []string `json:"tags"`
	Visibility   string   `json:"visibility"`
}

// CreateVideo creates a video "by URL" — the caller already has a hosted,
// playable file. Status starts as "processing": the worker (cmd/worker)
// picks it up, extracts duration, generates a thumbnail if none was given,
// and produces an HLS rendition. The original_url stays playable the whole
// time, so this never blocks watching the video — it only adds hls_playlist_url
// and duration once the worker finishes.
func (h *VideoHandler) CreateVideo(w http.ResponseWriter, r *http.Request) {
	var req createVideoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Title == "" || req.OriginalUrl == "" {
		http.Error(w, "title and original_url are required", http.StatusBadRequest)
		return
	}

	visibility := req.Visibility
	if visibility == "" {
		visibility = "public"
	}
	switch visibility {
	case "public", "unlisted", "private":
	default:
		http.Error(w, "visibility must be one of: public, unlisted, private", http.StatusBadRequest)
		return
	}

	user, _ := UserFromContext(r.Context())
	channel, err := h.repo.GetChannelByUserID(r.Context(), pgtype.UUID{Bytes: user.ID, Valid: true})
	if err != nil {
		http.Error(w, "create a channel before posting a video", http.StatusBadRequest)
		return
	}

	video, err := h.repo.CreateVideo(r.Context(), repository.CreateVideoParams{
		ChannelID:    pgtype.UUID{Bytes: channel.ID, Valid: true},
		Title:        req.Title,
		Description:  pgtype.Text{String: req.Description, Valid: req.Description != ""},
		Status:       "processing",
		Visibility:   visibility,
		Category:     pgtype.Text{String: req.Category, Valid: req.Category != ""},
		Tags:         req.Tags,
		OriginalUrl:  pgtype.Text{String: req.OriginalUrl, Valid: true},
		ThumbnailUrl: pgtype.Text{String: req.ThumbnailUrl, Valid: req.ThumbnailUrl != ""},
	})
	if err != nil {
		slog.Error("create video", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, toVideoResponse(video, channel))
}

// GetVideoByID does not currently enforce visibility (private/unlisted) —
// it returns any video to any caller. Add an ownership/visibility check
// here before private videos are a real feature.
func (h *VideoHandler) GetVideoByID(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid video id", http.StatusBadRequest)
		return
	}

	video, err := h.repo.GetVideoByID(r.Context(), id)
	if err != nil {
		http.Error(w, "video not found", http.StatusNotFound)
		return
	}

	channel, err := h.repo.GetChannelByID(r.Context(), uuid.UUID(video.ChannelID.Bytes))
	if err != nil {
		slog.Error("get video's channel", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, toVideoResponse(video, channel))
}

func (h *VideoHandler) ListRelatedVideos(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid video id", http.StatusBadRequest)
		return
	}

	video, err := h.repo.GetVideoByID(r.Context(), id)
	if err != nil {
		http.Error(w, "video not found", http.StatusNotFound)
		return
	}

	limit, _ := parseLimitOffset(r)

	videos, err := h.repo.ListRelatedVideos(r.Context(), repository.ListRelatedVideosParams{
		ID:        id,
		ChannelID: video.ChannelID,
		Category:  video.Category,
		Limit:     limit,
	})
	if err != nil {
		slog.Error("list related videos", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, toVideoResponses(r.Context(), h.repo, videos))
}

// parseLimitOffset reads ?limit=&offset= query params with sane defaults and
// bounds, shared across every paginated list endpoint.
func parseLimitOffset(r *http.Request) (limit int32, offset int32) {
	limit = 20
	if v := r.URL.Query().Get("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 && parsed <= 100 {
			limit = int32(parsed)
		}
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed >= 0 {
			offset = int32(parsed)
		}
	}
	return limit, offset
}

func (h *VideoHandler) ListVideosByChannel(w http.ResponseWriter, r *http.Request) {
	channel, err := h.repo.GetChannelByHandle(r.Context(), r.PathValue("handle"))
	if err != nil {
		http.Error(w, "channel not found", http.StatusNotFound)
		return
	}

	limit, offset := parseLimitOffset(r)

	videos, err := h.repo.ListVideosByChannel(r.Context(), repository.ListVideosByChannelParams{
		ChannelID: pgtype.UUID{Bytes: channel.ID, Valid: true},
		Limit:     limit,
		Offset:    offset,
	})
	if err != nil {
		slog.Error("list videos by channel", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// Every video here belongs to the same already-resolved channel, so no
	// per-video or batch lookup is needed the way the mixed-channel feeds do.
	resp := make([]videoResponse, len(videos))
	for i, v := range videos {
		resp[i] = toVideoResponse(v, channel)
	}

	writeJSON(w, http.StatusOK, resp)
}

// ListPublicVideos serves the home feed. Logged-in callers (route runs
// behind OptionalAuth) get a feed boosted by their own subscriptions and
// watch-history categories; everyone else gets plain recency.
func (h *VideoHandler) ListPublicVideos(w http.ResponseWriter, r *http.Request) {
	limit, offset := parseLimitOffset(r)

	user, ok := UserFromContext(r.Context())
	var videos []repository.Video
	var err error
	if ok {
		videos, err = h.repo.ListPersonalizedFeed(r.Context(), repository.ListPersonalizedFeedParams{
			UserID: pgtype.UUID{Bytes: user.ID, Valid: true},
			Limit:  limit,
			Offset: offset,
		})
	} else {
		videos, err = h.repo.ListPublicVideos(r.Context(), repository.ListPublicVideosParams{
			Limit:  limit,
			Offset: offset,
		})
	}
	if err != nil {
		slog.Error("list public videos", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, toVideoResponses(r.Context(), h.repo, videos))
}

// RecordView is unauthenticated by design — anonymous viewers still count.
// No abuse/rate-limit protection yet; fine for now, revisit if view counts
// ever need to be trustworthy for anything (ads, payouts, leaderboards).
func (h *VideoHandler) RecordView(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid video id", http.StatusBadRequest)
		return
	}

	video, err := h.repo.IncrementVideoViews(r.Context(), id)
	if err != nil {
		http.Error(w, "video not found", http.StatusNotFound)
		return
	}

	channel, err := h.repo.GetChannelByID(r.Context(), uuid.UUID(video.ChannelID.Bytes))
	if err != nil {
		slog.Error("get video's channel", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, toVideoResponse(video, channel))
}

// react toggles the caller's like/dislike on a video. Clicking the same
// reaction again removes it; clicking the opposite one switches it. Every
// transition adjusts both counters in one transaction, alongside the
// video_interactions row, so likes_count/dislikes_count can never drift out
// of sync with what's actually recorded per user.
func (h *VideoHandler) react(w http.ResponseWriter, r *http.Request, reactionType string) {
	videoID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid video id", http.StatusBadRequest)
		return
	}

	user, _ := UserFromContext(r.Context())
	userPg := pgtype.UUID{Bytes: user.ID, Valid: true}
	videoPg := pgtype.UUID{Bytes: videoID, Valid: true}

	var video repository.Video
	err = h.repo.WithTx(r.Context(), func(q repository.Querier) error {
		existing, getErr := q.GetVideoInteraction(r.Context(), repository.GetVideoInteractionParams{
			VideoID: videoPg,
			UserID:  userPg,
		})

		var likesDelta, dislikesDelta int64
		switch {
		case errors.Is(getErr, pgx.ErrNoRows):
			if _, err := q.CreateVideoInteraction(r.Context(), repository.CreateVideoInteractionParams{
				VideoID: videoPg,
				UserID:  userPg,
				Type:    reactionType,
			}); err != nil {
				return err
			}
			if reactionType == "like" {
				likesDelta = 1
			} else {
				dislikesDelta = 1
			}
		case getErr != nil:
			return getErr
		case existing.Type == reactionType:
			if err := q.DeleteVideoInteraction(r.Context(), repository.DeleteVideoInteractionParams{
				VideoID: videoPg,
				UserID:  userPg,
			}); err != nil {
				return err
			}
			if reactionType == "like" {
				likesDelta = -1
			} else {
				dislikesDelta = -1
			}
		default:
			if _, err := q.UpdateVideoInteractionType(r.Context(), repository.UpdateVideoInteractionTypeParams{
				VideoID: videoPg,
				UserID:  userPg,
				Type:    reactionType,
			}); err != nil {
				return err
			}
			if reactionType == "like" {
				likesDelta, dislikesDelta = 1, -1
			} else {
				likesDelta, dislikesDelta = -1, 1
			}
		}

		var adjustErr error
		video, adjustErr = q.AdjustVideoReactionCounts(r.Context(), repository.AdjustVideoReactionCountsParams{
			ID:            videoID,
			LikesDelta:    likesDelta,
			DislikesDelta: dislikesDelta,
		})
		return adjustErr
	})
	if err != nil {
		slog.Error("react to video", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	channel, err := h.repo.GetChannelByID(r.Context(), uuid.UUID(video.ChannelID.Bytes))
	if err != nil {
		slog.Error("get video's channel", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, toVideoResponse(video, channel))
}

func (h *VideoHandler) LikeVideo(w http.ResponseWriter, r *http.Request) {
	h.react(w, r, "like")
}

func (h *VideoHandler) DislikeVideo(w http.ResponseWriter, r *http.Request) {
	h.react(w, r, "dislike")
}

type myReactionResponse struct {
	Type *string `json:"type"`
}

func (h *VideoHandler) GetMyReaction(w http.ResponseWriter, r *http.Request) {
	videoID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid video id", http.StatusBadRequest)
		return
	}

	user, _ := UserFromContext(r.Context())

	interaction, err := h.repo.GetVideoInteraction(r.Context(), repository.GetVideoInteractionParams{
		VideoID: pgtype.UUID{Bytes: videoID, Valid: true},
		UserID:  pgtype.UUID{Bytes: user.ID, Valid: true},
	})
	if errors.Is(err, pgx.ErrNoRows) {
		writeJSON(w, http.StatusOK, myReactionResponse{Type: nil})
		return
	}
	if err != nil {
		slog.Error("get video interaction", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, myReactionResponse{Type: &interaction.Type})
}

func (h *VideoHandler) ListLikedVideos(w http.ResponseWriter, r *http.Request) {
	user, _ := UserFromContext(r.Context())
	limit, offset := parseLimitOffset(r)

	videos, err := h.repo.ListLikedVideosByUser(r.Context(), repository.ListLikedVideosByUserParams{
		UserID: pgtype.UUID{Bytes: user.ID, Valid: true},
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		slog.Error("list liked videos", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, toVideoResponses(r.Context(), h.repo, videos))
}

func (h *VideoHandler) AddWatchLater(w http.ResponseWriter, r *http.Request) {
	videoID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid video id", http.StatusBadRequest)
		return
	}
	user, _ := UserFromContext(r.Context())

	if err := h.repo.AddWatchLater(r.Context(), repository.AddWatchLaterParams{
		UserID:  user.ID,
		VideoID: videoID,
	}); err != nil {
		slog.Error("add watch later", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *VideoHandler) RemoveWatchLater(w http.ResponseWriter, r *http.Request) {
	videoID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid video id", http.StatusBadRequest)
		return
	}
	user, _ := UserFromContext(r.Context())

	if err := h.repo.RemoveWatchLater(r.Context(), repository.RemoveWatchLaterParams{
		UserID:  user.ID,
		VideoID: videoID,
	}); err != nil {
		slog.Error("remove watch later", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

type watchLaterStatusResponse struct {
	InWatchLater bool `json:"in_watch_later"`
}

func (h *VideoHandler) GetWatchLaterStatus(w http.ResponseWriter, r *http.Request) {
	videoID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid video id", http.StatusBadRequest)
		return
	}
	user, _ := UserFromContext(r.Context())

	inWatchLater, err := h.repo.IsInWatchLater(r.Context(), repository.IsInWatchLaterParams{
		UserID:  user.ID,
		VideoID: videoID,
	})
	if err != nil {
		slog.Error("get watch later status", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, watchLaterStatusResponse{InWatchLater: inWatchLater})
}

func (h *VideoHandler) ListWatchLater(w http.ResponseWriter, r *http.Request) {
	user, _ := UserFromContext(r.Context())
	limit, offset := parseLimitOffset(r)

	videos, err := h.repo.ListWatchLater(r.Context(), repository.ListWatchLaterParams{
		UserID: user.ID,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		slog.Error("list watch later", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, toVideoResponses(r.Context(), h.repo, videos))
}

func (h *VideoHandler) ListTrendingVideos(w http.ResponseWriter, r *http.Request) {
	limit, _ := parseLimitOffset(r)

	videos, err := h.repo.ListTrendingVideos(r.Context(), limit)
	if err != nil {
		slog.Error("list trending videos", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, toVideoResponses(r.Context(), h.repo, videos))
}

func (h *VideoHandler) SuggestVideoTitles(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		writeJSON(w, http.StatusOK, []string{})
		return
	}

	titles, err := h.repo.SuggestVideoTitles(r.Context(), query)
	if err != nil {
		slog.Error("suggest video titles", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, titles)
}

func (h *VideoHandler) SearchVideos(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		writeJSON(w, http.StatusOK, []videoResponse{})
		return
	}

	limit, offset := parseLimitOffset(r)

	videos, err := h.repo.SearchVideos(r.Context(), repository.SearchVideosParams{
		WebsearchToTsquery: query,
		Limit:              limit,
		Offset:             offset,
	})
	if err != nil {
		slog.Error("search videos", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, toVideoResponses(r.Context(), h.repo, videos))
}

func (h *VideoHandler) ReportVideo(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid video id", http.StatusBadRequest)
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

	if _, err := h.repo.GetVideoByID(r.Context(), id); err != nil {
		http.Error(w, "video not found", http.StatusNotFound)
		return
	}

	user, _ := UserFromContext(r.Context())

	if _, err := h.repo.CreateReport(r.Context(), repository.CreateReportParams{
		ReporterID: pgtype.UUID{Bytes: user.ID, Valid: true},
		VideoID:    pgtype.UUID{Bytes: id, Valid: true},
		Reason:     req.Reason,
	}); err != nil {
		slog.Error("report video", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

type updateVideoRequest struct {
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	ThumbnailUrl string   `json:"thumbnail_url"`
	Category     string   `json:"category"`
	Tags         []string `json:"tags"`
	Visibility   string   `json:"visibility"`
}

func (h *VideoHandler) UpdateVideo(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid video id", http.StatusBadRequest)
		return
	}

	video, err := h.repo.GetVideoByID(r.Context(), id)
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

	var req updateVideoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Title == "" {
		http.Error(w, "title is required", http.StatusBadRequest)
		return
	}

	visibility := req.Visibility
	if visibility == "" {
		visibility = video.Visibility
	}

	updated, err := h.repo.UpdateVideo(r.Context(), repository.UpdateVideoParams{
		ID:           id,
		Title:        req.Title,
		Description:  pgtype.Text{String: req.Description, Valid: req.Description != ""},
		ThumbnailUrl: pgtype.Text{String: req.ThumbnailUrl, Valid: req.ThumbnailUrl != ""},
		Category:     pgtype.Text{String: req.Category, Valid: req.Category != ""},
		Tags:         req.Tags,
		Visibility:   visibility,
	})
	if err != nil {
		slog.Error("update video", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, toVideoResponse(updated, channel))
}

func (h *VideoHandler) ListShorts(w http.ResponseWriter, r *http.Request) {
	limit, offset := parseLimitOffset(r)
	videos, err := h.repo.ListShorts(r.Context(), repository.ListShortsParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		slog.Error("list shorts", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, toVideoResponses(r.Context(), h.repo, videos))
}
