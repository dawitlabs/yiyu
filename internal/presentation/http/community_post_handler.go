package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	"github.com/dawitlabs/yiyu/internal/ports"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type communityPostRepository interface {
	ports.CommunityPostRepository
	ports.ChannelRepository
	WithTx(ctx context.Context, fn func(repository.Querier) error) error
}

type CommunityPostHandler struct {
	repo communityPostRepository
}

func NewCommunityPostHandler(repo communityPostRepository) *CommunityPostHandler {
	return &CommunityPostHandler{repo: repo}
}

type communityPostResponse struct {
	ID         string    `json:"id"`
	ChannelID  string    `json:"channel_id"`
	Content    string    `json:"content"`
	ImageURL   string    `json:"image_url"`
	LikesCount int64     `json:"likes_count"`
	CreatedAt  time.Time `json:"created_at"`
}

func toCommunityPostResponse(p repository.CommunityPost) communityPostResponse {
	return communityPostResponse{
		ID:         p.ID.String(),
		ChannelID:  uuid.UUID(p.ChannelID.Bytes).String(),
		Content:    p.Content,
		ImageURL:   p.ImageUrl.String,
		LikesCount: p.LikesCount.Int64,
		CreatedAt:  p.CreatedAt.Time,
	}
}

type createCommunityPostRequest struct {
	Content  string `json:"content"`
	ImageURL string `json:"image_url"`
}

// CreatePost posts to the caller's own channel — {id} in the route is the
// channel id, checked against the caller's own channel rather than trusted
// from the URL.
func (h *CommunityPostHandler) CreatePost(w http.ResponseWriter, r *http.Request) {
	channelID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid channel id", http.StatusBadRequest)
		return
	}

	var req createCommunityPostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Content == "" {
		http.Error(w, "content is required", http.StatusBadRequest)
		return
	}

	channel, err := h.repo.GetChannelByID(r.Context(), channelID)
	if err != nil {
		http.Error(w, "channel not found", http.StatusNotFound)
		return
	}

	user, _ := UserFromContext(r.Context())
	if !channel.UserID.Valid || channel.UserID.Bytes != user.ID {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	post, err := h.repo.CreateCommunityPost(r.Context(), repository.CreateCommunityPostParams{
		ChannelID: pgtype.UUID{Bytes: channel.ID, Valid: true},
		Content:   req.Content,
		ImageUrl:  pgtype.Text{String: req.ImageURL, Valid: req.ImageURL != ""},
	})
	if err != nil {
		slog.Error("create community post", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, toCommunityPostResponse(post))
}

func (h *CommunityPostHandler) ListPostsByChannel(w http.ResponseWriter, r *http.Request) {
	channel, err := h.repo.GetChannelByHandle(r.Context(), r.PathValue("handle"))
	if err != nil {
		http.Error(w, "channel not found", http.StatusNotFound)
		return
	}

	limit, offset := parseLimitOffset(r)

	posts, err := h.repo.ListCommunityPostsByChannel(r.Context(), repository.ListCommunityPostsByChannelParams{
		ChannelID: pgtype.UUID{Bytes: channel.ID, Valid: true},
		Limit:     limit,
		Offset:    offset,
	})
	if err != nil {
		slog.Error("list community posts", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	resp := make([]communityPostResponse, len(posts))
	for i, p := range posts {
		resp[i] = toCommunityPostResponse(p)
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *CommunityPostHandler) DeletePost(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid post id", http.StatusBadRequest)
		return
	}

	post, err := h.repo.GetCommunityPostByID(r.Context(), id)
	if err != nil {
		http.Error(w, "post not found", http.StatusNotFound)
		return
	}

	channel, err := h.repo.GetChannelByID(r.Context(), uuid.UUID(post.ChannelID.Bytes))
	if err != nil {
		http.Error(w, "post not found", http.StatusNotFound)
		return
	}

	user, _ := UserFromContext(r.Context())
	isOwner := channel.UserID.Valid && channel.UserID.Bytes == user.ID
	isAdmin := user.Role == repository.UserRoleAdmin
	if !isOwner && !isAdmin {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.repo.DeleteCommunityPost(r.Context(), id); err != nil {
		slog.Error("delete community post", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// LikePost toggles the caller's like — same insert-or-delete-plus-counter
// pattern as CommentHandler.LikeComment.
func (h *CommunityPostHandler) LikePost(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid post id", http.StatusBadRequest)
		return
	}

	if _, err := h.repo.GetCommunityPostByID(r.Context(), id); err != nil {
		http.Error(w, "post not found", http.StatusNotFound)
		return
	}

	user, _ := UserFromContext(r.Context())

	var liked bool
	err = h.repo.WithTx(r.Context(), func(q repository.Querier) error {
		_, getErr := q.GetCommunityPostLike(r.Context(), repository.GetCommunityPostLikeParams{
			PostID: id,
			UserID: user.ID,
		})
		switch {
		case errors.Is(getErr, pgx.ErrNoRows):
			if err := q.CreateCommunityPostLike(r.Context(), repository.CreateCommunityPostLikeParams{
				PostID: id,
				UserID: user.ID,
			}); err != nil {
				return err
			}
			if _, err := q.IncrementCommunityPostLikes(r.Context(), id); err != nil {
				return err
			}
			liked = true
			return nil
		case getErr != nil:
			return getErr
		default:
			if err := q.DeleteCommunityPostLike(r.Context(), repository.DeleteCommunityPostLikeParams{
				PostID: id,
				UserID: user.ID,
			}); err != nil {
				return err
			}
			if _, err := q.DecrementCommunityPostLikes(r.Context(), id); err != nil {
				return err
			}
			liked = false
			return nil
		}
	})
	if err != nil {
		slog.Error("like community post", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"liked": liked})
}
