package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	"github.com/dawitlabs/yiyu/internal/pkg/session"
	"github.com/dawitlabs/yiyu/internal/ports"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type liveStreamRepository interface {
	ports.LiveStreamRepository
	ports.ChannelRepository
}

// LiveStreamHandler issues per-channel RTMP stream keys and proxies HLS
// playback from the MediaMTX media server, which does the actual RTMP
// ingest and HLS packaging — this handler never touches video bytes.
type LiveStreamHandler struct {
	repo       liveStreamRepository
	rtmpServer string // shown to creators as the OBS "Server" field, e.g. rtmp://host:1935/live
	hlsBaseURL string // MediaMTX's internal HLS server, e.g. http://mediamtx:8888 — never exposed to clients directly
}

func NewLiveStreamHandler(repo liveStreamRepository, rtmpServer, hlsBaseURL string) *LiveStreamHandler {
	return &LiveStreamHandler{repo: repo, rtmpServer: rtmpServer, hlsBaseURL: hlsBaseURL}
}

func (h *LiveStreamHandler) isChannelOwner(r *http.Request, channel repository.Channel) bool {
	user, ok := UserFromContext(r.Context())
	return ok && channel.UserID.Valid && channel.UserID.Bytes == user.ID
}

// IssueStreamKey generates a fresh stream key for the caller's channel,
// overwriting any previous one — the old key stops working immediately.
// The raw key is only ever returned here; it isn't stored anywhere it could
// be read back later, so losing it means generating a new one.
func (h *LiveStreamHandler) IssueStreamKey(w http.ResponseWriter, r *http.Request) {
	channelID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid channel id", http.StatusBadRequest)
		return
	}

	channel, err := h.repo.GetChannelByID(r.Context(), channelID)
	if err != nil {
		http.Error(w, "channel not found", http.StatusNotFound)
		return
	}
	if !h.isChannelOwner(r, channel) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	rawKey, _, err := session.Generate()
	if err != nil {
		slog.Error("generate stream key", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	if _, err := h.repo.UpsertLiveStreamKey(r.Context(), repository.UpsertLiveStreamKeyParams{
		ChannelID: pgtype.UUID{Bytes: channel.ID, Valid: true},
		StreamKey: rawKey,
	}); err != nil {
		slog.Error("issue stream key", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"rtmp_server": h.rtmpServer,
		"stream_key":  rawKey,
	})
}

type liveStatusResponse struct {
	IsLive bool   `json:"is_live"`
	Title  string `json:"title"`
	HLSURL string `json:"hls_url,omitempty"`
}

// GetLiveStatus is what the channel page polls (or loads once server-side)
// to decide whether to show a "LIVE" badge — public, no auth required.
func (h *LiveStreamHandler) GetLiveStatus(w http.ResponseWriter, r *http.Request) {
	channel, err := h.repo.GetChannelByHandle(r.Context(), r.PathValue("handle"))
	if err != nil {
		http.Error(w, "channel not found", http.StatusNotFound)
		return
	}

	stream, err := h.repo.GetLiveStreamByChannelID(r.Context(), pgtype.UUID{Bytes: channel.ID, Valid: true})
	if err != nil {
		// No live_streams row yet means this channel has never gone live.
		writeJSON(w, http.StatusOK, liveStatusResponse{IsLive: false})
		return
	}

	resp := liveStatusResponse{IsLive: stream.Status == "live", Title: stream.Title}
	if resp.IsLive {
		resp.HLSURL = fmt.Sprintf("/live/%s/index.m3u8", channel.Handle)
	}
	writeJSON(w, http.StatusOK, resp)
}

type setLiveTitleRequest struct {
	Title string `json:"title"`
}

func (h *LiveStreamHandler) SetTitle(w http.ResponseWriter, r *http.Request) {
	channelID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid channel id", http.StatusBadRequest)
		return
	}

	var req setLiveTitleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	channel, err := h.repo.GetChannelByID(r.Context(), channelID)
	if err != nil {
		http.Error(w, "channel not found", http.StatusNotFound)
		return
	}
	if !h.isChannelOwner(r, channel) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if _, err := h.repo.UpdateLiveStreamTitle(r.Context(), repository.UpdateLiveStreamTitleParams{
		ChannelID: pgtype.UUID{Bytes: channel.ID, Valid: true},
		Title:     req.Title,
	}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "generate a stream key before setting a title", http.StatusBadRequest)
			return
		}
		slog.Error("set live title", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ProxyHLS serves a live channel's HLS files from MediaMTX under a public
// path keyed by channel handle, so the secret stream_key is never sent to
// viewers — only this server ever sees it.
func (h *LiveStreamHandler) ProxyHLS(w http.ResponseWriter, r *http.Request) {
	file := r.PathValue("file")
	if file == "" || strings.Contains(file, "..") {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}

	channel, err := h.repo.GetChannelByHandle(r.Context(), r.PathValue("handle"))
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	stream, err := h.repo.GetLiveStreamByChannelID(r.Context(), pgtype.UUID{Bytes: channel.ID, Valid: true})
	if err != nil || stream.Status != "live" {
		http.Error(w, "channel is not live", http.StatusNotFound)
		return
	}

	// MediaMTX's HLS path mirrors its RTMP path exactly ("live/{key}"), not
	// just the bare key — same structure the poller has to account for.
	// The query string matters too: MediaMTX hands out a "?session=..." on
	// content it returns when no cookie was sent (which a stateless proxy
	// never does), and the player's follow-up segment requests carry it.
	upstreamURL := fmt.Sprintf("%s/live/%s/%s", h.hlsBaseURL, stream.StreamKey, file)
	if r.URL.RawQuery != "" {
		upstreamURL += "?" + r.URL.RawQuery
	}
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, upstreamURL, nil)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		http.Error(w, "live stream unavailable", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if ct := resp.Header.Get("Content-Type"); ct != "" {
		w.Header().Set("Content-Type", ct)
	}
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}
