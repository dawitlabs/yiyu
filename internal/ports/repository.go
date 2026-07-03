package ports

import (
	"context"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type Repository interface {
	UserRepository
	SessionRepository
	VideoRepository
	ChannelRepository
	// CommentRepository
	// ShareRepository
	// FavouriteRepository
	// WatchlistRepository
	// HistoryRepository
	// RecommendationRepository

	// WithTx runs fn inside a single transaction, giving it access to every
	// query method (repository.Querier is the full sqlc-generated set) —
	// for operations that need more than one statement to stay atomic.
	WithTx(ctx context.Context, fn func(repository.Querier) error) error
}

type UserRepository interface {
	CreateUser(ctx context.Context, arg repository.CreateUserParams) (repository.User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (repository.User, error)
	GetUserByEmail(ctx context.Context, email string) (repository.User, error)
	GetUserByUsername(ctx context.Context, username string) (repository.User, error)
	UpdateUser(ctx context.Context, arg repository.UpdateUserParams) (repository.User, error)
	DeleteUser(ctx context.Context, arg repository.DeleteUserParams) (repository.User, error)
	AdminDeleteUser(ctx context.Context, arg repository.AdminDeleteUserParams) error
	AdminGetAllUsers(ctx context.Context, arg repository.AdminGetAllUsersParams) ([]repository.User, error)
	AdminUpdateUserRole(ctx context.Context, arg repository.AdminUpdateUserRoleParams) (repository.User, error)
}

type SessionRepository interface {
	CreateSession(ctx context.Context, arg repository.CreateSessionParams) (repository.Session, error)
	GetSessionWithUser(ctx context.Context, tokenHash string) (repository.GetSessionWithUserRow, error)
	DeleteSession(ctx context.Context, tokenHash string) error
	DeleteUserSessions(ctx context.Context, userID uuid.UUID) error
}

type VideoRepository interface {
	CreateVideo(ctx context.Context, arg repository.CreateVideoParams) (repository.Video, error)
	GetVideoByID(ctx context.Context, id uuid.UUID) (repository.Video, error)
	ListVideosByChannel(ctx context.Context, arg repository.ListVideosByChannelParams) ([]repository.Video, error)
	UpdateVideoStatus(ctx context.Context, arg repository.UpdateVideoStatusParams) (repository.Video, error)
	IncrementVideoViews(ctx context.Context, id uuid.UUID) (repository.Video, error)
	IncrementVideoLikes(ctx context.Context, id uuid.UUID) (repository.Video, error)
	IncrementVideoDislikes(ctx context.Context, id uuid.UUID) (repository.Video, error)
	ListPublicVideos(ctx context.Context, arg repository.ListPublicVideosParams) ([]repository.Video, error)
	GetVideoInteraction(ctx context.Context, arg repository.GetVideoInteractionParams) (repository.VideoInteraction, error)
}

type ChannelRepository interface {
	CreateChannel(ctx context.Context, arg repository.CreateChannelParams) (repository.Channel, error)
	GetChannelByID(ctx context.Context, id uuid.UUID) (repository.Channel, error)
	GetChannelByHandle(ctx context.Context, handle string) (repository.Channel, error)
	GetChannelByUserID(ctx context.Context, userID pgtype.UUID) (repository.Channel, error)
	UpdateChannel(ctx context.Context, arg repository.UpdateChannelParams) (repository.Channel, error)
}

// Compile-time guard: PostgresRepository must satisfy Repository in full.
var _ Repository = (*repository.PostgresRepository)(nil)
