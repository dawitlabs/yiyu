package httpapi

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	"github.com/dawitlabs/yiyu/internal/ports"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

// subscriptionRepository needs WithTx alongside the plain reads — subscribing
// touches both the subscriptions row and the channel's subscriber_count, and
// those two writes must not drift apart under concurrent requests.
type subscriptionRepository interface {
	ports.SubscriptionRepository
	ports.ChannelRepository
	WithTx(ctx context.Context, fn func(repository.Querier) error) error
}

type SubscriptionHandler struct {
	repo subscriptionRepository
}

func NewSubscriptionHandler(repo subscriptionRepository) *SubscriptionHandler {
	return &SubscriptionHandler{repo: repo}
}

func (h *SubscriptionHandler) Subscribe(w http.ResponseWriter, r *http.Request) {
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

	user, _ := UserFromContext(r.Context())
	channelPg := pgtype.UUID{Bytes: channelID, Valid: true}
	userPg := pgtype.UUID{Bytes: user.ID, Valid: true}

	err = h.repo.WithTx(r.Context(), func(q repository.Querier) error {
		if _, err := q.CreateSubscription(r.Context(), repository.CreateSubscriptionParams{
			ChannelID: channelPg,
			UserID:    userPg,
		}); err != nil {
			return err
		}
		if _, err := q.AdjustChannelSubscriberCount(r.Context(), repository.AdjustChannelSubscriberCountParams{
			ID:    channelID,
			Delta: 1,
		}); err != nil {
			return err
		}
		if channel.UserID.Valid && channel.UserID.Bytes != user.ID {
			if _, err := q.CreateNotification(r.Context(), repository.CreateNotificationParams{
				UserID:  channel.UserID,
				Type:    "new_subscriber",
				ActorID: userPg,
			}); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			http.Error(w, "already subscribed", http.StatusConflict)
			return
		}
		slog.Error("subscribe", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *SubscriptionHandler) Unsubscribe(w http.ResponseWriter, r *http.Request) {
	channelID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid channel id", http.StatusBadRequest)
		return
	}

	user, _ := UserFromContext(r.Context())
	channelPg := pgtype.UUID{Bytes: channelID, Valid: true}
	userPg := pgtype.UUID{Bytes: user.ID, Valid: true}

	err = h.repo.WithTx(r.Context(), func(q repository.Querier) error {
		if _, err := q.GetSubscription(r.Context(), repository.GetSubscriptionParams{
			ChannelID: channelPg,
			UserID:    userPg,
		}); err != nil {
			return err
		}
		if err := q.DeleteSubscription(r.Context(), repository.DeleteSubscriptionParams{
			ChannelID: channelPg,
			UserID:    userPg,
		}); err != nil {
			return err
		}
		_, err := q.AdjustChannelSubscriberCount(r.Context(), repository.AdjustChannelSubscriberCountParams{
			ID:    channelID,
			Delta: -1,
		})
		return err
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "not subscribed", http.StatusNotFound)
			return
		}
		slog.Error("unsubscribe", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

type subscriptionStatusResponse struct {
	Subscribed bool `json:"subscribed"`
}

func (h *SubscriptionHandler) GetSubscriptionStatus(w http.ResponseWriter, r *http.Request) {
	channelID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid channel id", http.StatusBadRequest)
		return
	}

	user, _ := UserFromContext(r.Context())

	_, err = h.repo.GetSubscription(r.Context(), repository.GetSubscriptionParams{
		ChannelID: pgtype.UUID{Bytes: channelID, Valid: true},
		UserID:    pgtype.UUID{Bytes: user.ID, Valid: true},
	})

	writeJSON(w, http.StatusOK, subscriptionStatusResponse{Subscribed: err == nil})
}

func (h *SubscriptionHandler) GetFeed(w http.ResponseWriter, r *http.Request) {
	user, _ := UserFromContext(r.Context())
	limit, offset := parseLimitOffset(r)

	videos, err := h.repo.ListSubscriptionFeed(r.Context(), repository.ListSubscriptionFeedParams{
		UserID: pgtype.UUID{Bytes: user.ID, Valid: true},
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		slog.Error("subscription feed", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	resp := toVideoResponses(r.Context(), h.repo, videos)

	writeJSON(w, http.StatusOK, resp)
}
