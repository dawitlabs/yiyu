package httpapi

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	"github.com/dawitlabs/yiyu/internal/ports"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

type ChannelHandler struct {
	repo ports.ChannelRepository
}

func NewChannelHandler(repo ports.ChannelRepository) *ChannelHandler {
	return &ChannelHandler{repo: repo}
}

type channelResponse struct {
	ID              string    `json:"id"`
	Handle          string    `json:"handle"`
	Name            string    `json:"name"`
	Description     string    `json:"description"`
	AvatarUrl       string    `json:"avatar_url"`
	BannerUrl       string    `json:"banner_url"`
	SubscriberCount int64     `json:"subscriber_count"`
	CreatedAt       time.Time `json:"created_at"`
}

func toChannelResponse(c repository.Channel) channelResponse {
	return channelResponse{
		ID:              c.ID.String(),
		Handle:          c.Handle,
		Name:            c.Name,
		Description:     c.Description.String,
		AvatarUrl:       c.AvatarUrl.String,
		BannerUrl:       c.BannerUrl.String,
		SubscriberCount: c.SubscriberCount.Int64,
		CreatedAt:       c.CreatedAt.Time,
	}
}

type createChannelRequest struct {
	Handle      string `json:"handle"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (h *ChannelHandler) CreateChannel(w http.ResponseWriter, r *http.Request) {
	var req createChannelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Handle == "" || req.Name == "" {
		http.Error(w, "handle and name are required", http.StatusBadRequest)
		return
	}

	user, _ := UserFromContext(r.Context())

	channel, err := h.repo.CreateChannel(r.Context(), repository.CreateChannelParams{
		UserID:      pgtype.UUID{Bytes: user.ID, Valid: true},
		Handle:      req.Handle,
		Name:        req.Name,
		Description: pgtype.Text{String: req.Description, Valid: req.Description != ""},
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			switch pgErr.ConstraintName {
			case "channels_handle_key":
				http.Error(w, "handle is already taken", http.StatusConflict)
				return
			case "channels_user_id_key":
				http.Error(w, "you already have a channel", http.StatusConflict)
				return
			}
		}
		log.Printf("create channel: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, toChannelResponse(channel))
}

func (h *ChannelHandler) GetChannelByHandle(w http.ResponseWriter, r *http.Request) {
	channel, err := h.repo.GetChannelByHandle(r.Context(), r.PathValue("handle"))
	if err != nil {
		http.Error(w, "channel not found", http.StatusNotFound)
		return
	}

	writeJSON(w, http.StatusOK, toChannelResponse(channel))
}

type updateChannelRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	AvatarUrl   string `json:"avatar_url"`
	BannerUrl   string `json:"banner_url"`
}

func (h *ChannelHandler) UpdateChannel(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid channel id", http.StatusBadRequest)
		return
	}

	channel, err := h.repo.GetChannelByID(r.Context(), id)
	if err != nil {
		http.Error(w, "channel not found", http.StatusNotFound)
		return
	}

	user, _ := UserFromContext(r.Context())
	if !channel.UserID.Valid || channel.UserID.Bytes != user.ID {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var req updateChannelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}

	updated, err := h.repo.UpdateChannel(r.Context(), repository.UpdateChannelParams{
		ID:          id,
		Name:        req.Name,
		Description: pgtype.Text{String: req.Description, Valid: req.Description != ""},
		AvatarUrl:   pgtype.Text{String: req.AvatarUrl, Valid: req.AvatarUrl != ""},
		BannerUrl:   pgtype.Text{String: req.BannerUrl, Valid: req.BannerUrl != ""},
	})
	if err != nil {
		log.Printf("update channel: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, toChannelResponse(updated))
}
