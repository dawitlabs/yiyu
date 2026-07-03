package ports

import (
	"context"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	"github.com/google/uuid"
)

type Repository interface {
	UserRepository
	SessionRepository
	VideoRepository
	// ChannelRepository
	// CommentRepository
	// ShareRepository
	// FavouriteRepository
	// WatchlistRepository
	// HistoryRepository
	// RecommendationRepository
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
}

// Compile-time guard: PostgresRepository must satisfy Repository in full.
var _ Repository = (*repository.PostgresRepository)(nil)
