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
	CommentRepository
	SubscriptionRepository
	ReportRepository
	WatchHistoryRepository
	PlaylistRepository
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
	IncrementVideoViews(ctx context.Context, id uuid.UUID) (repository.Video, error)
	IncrementVideoLikes(ctx context.Context, id uuid.UUID) (repository.Video, error)
	IncrementVideoDislikes(ctx context.Context, id uuid.UUID) (repository.Video, error)
	ListPublicVideos(ctx context.Context, arg repository.ListPublicVideosParams) ([]repository.Video, error)
	GetVideoInteraction(ctx context.Context, arg repository.GetVideoInteractionParams) (repository.VideoInteraction, error)
	SearchVideos(ctx context.Context, arg repository.SearchVideosParams) ([]repository.Video, error)
	AdminListVideos(ctx context.Context, arg repository.AdminListVideosParams) ([]repository.Video, error)
	AdminDeleteVideo(ctx context.Context, id uuid.UUID) error
	ClaimNextPendingVideo(ctx context.Context) (repository.Video, error)
	CompleteVideoProcessing(ctx context.Context, arg repository.CompleteVideoProcessingParams) (repository.Video, error)
	FailVideoProcessing(ctx context.Context, id uuid.UUID) error
}

type ChannelRepository interface {
	CreateChannel(ctx context.Context, arg repository.CreateChannelParams) (repository.Channel, error)
	GetChannelByID(ctx context.Context, id uuid.UUID) (repository.Channel, error)
	GetChannelByHandle(ctx context.Context, handle string) (repository.Channel, error)
	GetChannelByUserID(ctx context.Context, userID pgtype.UUID) (repository.Channel, error)
	UpdateChannel(ctx context.Context, arg repository.UpdateChannelParams) (repository.Channel, error)
}

type CommentRepository interface {
	CreateComment(ctx context.Context, arg repository.CreateCommentParams) (repository.Comment, error)
	GetCommentByID(ctx context.Context, id uuid.UUID) (repository.Comment, error)
	ListCommentsByVideo(ctx context.Context, arg repository.ListCommentsByVideoParams) ([]repository.ListCommentsByVideoRow, error)
	DeleteComment(ctx context.Context, id uuid.UUID) error
}

type SubscriptionRepository interface {
	GetSubscription(ctx context.Context, arg repository.GetSubscriptionParams) (repository.Subscription, error)
	ListSubscriptionFeed(ctx context.Context, arg repository.ListSubscriptionFeedParams) ([]repository.Video, error)
}

type ReportRepository interface {
	CreateReport(ctx context.Context, arg repository.CreateReportParams) (repository.Report, error)
	AdminListReports(ctx context.Context, arg repository.AdminListReportsParams) ([]repository.AdminListReportsRow, error)
	AdminUpdateReportStatus(ctx context.Context, arg repository.AdminUpdateReportStatusParams) (repository.Report, error)
}

type WatchHistoryRepository interface {
	UpsertWatchHistory(ctx context.Context, arg repository.UpsertWatchHistoryParams) (repository.WatchHistory, error)
	ListWatchHistory(ctx context.Context, arg repository.ListWatchHistoryParams) ([]repository.Video, error)
}

type PlaylistRepository interface {
	CreatePlaylist(ctx context.Context, arg repository.CreatePlaylistParams) (repository.Playlist, error)
	GetPlaylistByID(ctx context.Context, id uuid.UUID) (repository.Playlist, error)
	ListPlaylistsByChannel(ctx context.Context, arg repository.ListPlaylistsByChannelParams) ([]repository.Playlist, error)
	DeletePlaylist(ctx context.Context, id uuid.UUID) error
	AddVideoToPlaylist(ctx context.Context, arg repository.AddVideoToPlaylistParams) (repository.PlaylistVideo, error)
	RemoveVideoFromPlaylist(ctx context.Context, arg repository.RemoveVideoFromPlaylistParams) error
	ListPlaylistVideos(ctx context.Context, id uuid.UUID) ([]repository.Video, error)
}

// Compile-time guard: PostgresRepository must satisfy Repository in full.
var _ Repository = (*repository.PostgresRepository)(nil)
