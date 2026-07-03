package httpapi

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	"github.com/dawitlabs/yiyu/internal/ports"
	"github.com/jackc/pgx/v5/pgtype"
)

type analyticsRepository interface {
	ports.AnalyticsRepository
	ports.ChannelRepository
}

type AnalyticsHandler struct {
	repo analyticsRepository
}

func NewAnalyticsHandler(repo analyticsRepository) *AnalyticsHandler {
	return &AnalyticsHandler{repo: repo}
}

type videoStatResponse struct {
	ID            string    `json:"id"`
	Title         string    `json:"title"`
	ViewsCount    int64     `json:"views_count"`
	LikesCount    int64     `json:"likes_count"`
	DislikesCount int64     `json:"dislikes_count"`
	UploadedAt    time.Time `json:"uploaded_at"`
}

type channelAnalyticsResponse struct {
	TotalViews        int64               `json:"total_views"`
	TotalLikes        int64               `json:"total_likes"`
	TotalDislikes     int64               `json:"total_dislikes"`
	TotalVideos       int64               `json:"total_videos"`
	SubscriberCount   int64               `json:"subscriber_count"`
	NewSubscribers7d  int64               `json:"new_subscribers_7d"`
	NewSubscribers30d int64               `json:"new_subscribers_30d"`
	Videos            []videoStatResponse `json:"videos"`
}

// GetMyChannelAnalytics is scoped to the caller's own channel only — this is
// private creator data (view/like counts already surface publicly per
// video, but the aggregate + subscriber-growth view is not for anyone else).
func (h *AnalyticsHandler) GetMyChannelAnalytics(w http.ResponseWriter, r *http.Request) {
	user, _ := UserFromContext(r.Context())

	channel, err := h.repo.GetChannelByUserID(r.Context(), pgtype.UUID{Bytes: user.ID, Valid: true})
	if err != nil {
		http.Error(w, "create a channel first", http.StatusBadRequest)
		return
	}
	channelPg := pgtype.UUID{Bytes: channel.ID, Valid: true}

	summary, err := h.repo.GetChannelAnalyticsSummary(r.Context(), channelPg)
	if err != nil {
		slog.Error("get channel analytics summary", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	now := time.Now()
	new7d, err := h.repo.CountNewSubscribersSince(r.Context(), repository.CountNewSubscribersSinceParams{
		ChannelID: channelPg,
		CreatedAt: pgtype.Timestamptz{Time: now.AddDate(0, 0, -7), Valid: true},
	})
	if err != nil {
		slog.Error("count new subscribers 7d", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	new30d, err := h.repo.CountNewSubscribersSince(r.Context(), repository.CountNewSubscribersSinceParams{
		ChannelID: channelPg,
		CreatedAt: pgtype.Timestamptz{Time: now.AddDate(0, 0, -30), Valid: true},
	})
	if err != nil {
		slog.Error("count new subscribers 30d", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	limit, offset := parseLimitOffset(r)
	videoStats, err := h.repo.ListChannelVideoStats(r.Context(), repository.ListChannelVideoStatsParams{
		ChannelID: channelPg,
		Limit:     limit,
		Offset:    offset,
	})
	if err != nil {
		slog.Error("list channel video stats", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	videos := make([]videoStatResponse, len(videoStats))
	for i, v := range videoStats {
		videos[i] = videoStatResponse{
			ID:            v.ID.String(),
			Title:         v.Title,
			ViewsCount:    v.ViewsCount.Int64,
			LikesCount:    v.LikesCount.Int64,
			DislikesCount: v.DislikesCount.Int64,
			UploadedAt:    v.UploadedAt.Time,
		}
	}

	writeJSON(w, http.StatusOK, channelAnalyticsResponse{
		TotalViews:        summary.TotalViews,
		TotalLikes:        summary.TotalLikes,
		TotalDislikes:     summary.TotalDislikes,
		TotalVideos:       summary.TotalVideos,
		SubscriberCount:   channel.SubscriberCount.Int64,
		NewSubscribers7d:  new7d,
		NewSubscribers30d: new30d,
		Videos:            videos,
	})
}
