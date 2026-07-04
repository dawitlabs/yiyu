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
	NotificationRepository
	CaptionRepository
	ChapterRepository
	AnalyticsRepository
	CommunityPostRepository
	LiveStreamRepository
	EndScreenRepository

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
	ListPersonalizedFeed(ctx context.Context, arg repository.ListPersonalizedFeedParams) ([]repository.Video, error)
	ListRelatedVideos(ctx context.Context, arg repository.ListRelatedVideosParams) ([]repository.Video, error)
	GetVideoInteraction(ctx context.Context, arg repository.GetVideoInteractionParams) (repository.VideoInteraction, error)
	ListLikedVideosByUser(ctx context.Context, arg repository.ListLikedVideosByUserParams) ([]repository.Video, error)
	AddWatchLater(ctx context.Context, arg repository.AddWatchLaterParams) error
	RemoveWatchLater(ctx context.Context, arg repository.RemoveWatchLaterParams) error
	IsInWatchLater(ctx context.Context, arg repository.IsInWatchLaterParams) (bool, error)
	ListWatchLater(ctx context.Context, arg repository.ListWatchLaterParams) ([]repository.Video, error)
	ListTrendingVideos(ctx context.Context, limit int32) ([]repository.Video, error)
	SuggestVideoTitles(ctx context.Context, prefix string) ([]string, error)
	SearchVideos(ctx context.Context, arg repository.SearchVideosParams) ([]repository.Video, error)
	AdminListVideos(ctx context.Context, arg repository.AdminListVideosParams) ([]repository.Video, error)
	AdminDeleteVideo(ctx context.Context, id uuid.UUID) error
	ClaimNextPendingVideo(ctx context.Context) (repository.Video, error)
	CompleteVideoProcessing(ctx context.Context, arg repository.CompleteVideoProcessingParams) (repository.Video, error)
	FailVideoProcessing(ctx context.Context, id uuid.UUID) error
	UpdateVideo(ctx context.Context, arg repository.UpdateVideoParams) (repository.Video, error)
	ListShorts(ctx context.Context, arg repository.ListShortsParams) ([]repository.Video, error)
}

type ChannelRepository interface {
	CreateChannel(ctx context.Context, arg repository.CreateChannelParams) (repository.Channel, error)
	GetChannelByID(ctx context.Context, id uuid.UUID) (repository.Channel, error)
	GetChannelByHandle(ctx context.Context, handle string) (repository.Channel, error)
	GetChannelByUserID(ctx context.Context, userID pgtype.UUID) (repository.Channel, error)
	UpdateChannel(ctx context.Context, arg repository.UpdateChannelParams) (repository.Channel, error)
	ListChannels(ctx context.Context, arg repository.ListChannelsParams) ([]repository.Channel, error)
	GetChannelsByIDs(ctx context.Context, ids []uuid.UUID) ([]repository.Channel, error)
}

type CommentRepository interface {
	CreateComment(ctx context.Context, arg repository.CreateCommentParams) (repository.Comment, error)
	GetCommentByID(ctx context.Context, id uuid.UUID) (repository.Comment, error)
	ListCommentsByVideo(ctx context.Context, arg repository.ListCommentsByVideoParams) ([]repository.ListCommentsByVideoRow, error)
	ListCommentReplies(ctx context.Context, arg repository.ListCommentRepliesParams) ([]repository.ListCommentRepliesRow, error)
	DeleteComment(ctx context.Context, id uuid.UUID) error
	GetCommentLike(ctx context.Context, arg repository.GetCommentLikeParams) (repository.CommentLike, error)
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
	ListAllPlaylistsByChannel(ctx context.Context, arg repository.ListAllPlaylistsByChannelParams) ([]repository.Playlist, error)
}

type LiveStreamRepository interface {
	UpsertLiveStreamKey(ctx context.Context, arg repository.UpsertLiveStreamKeyParams) (repository.LiveStream, error)
	GetLiveStreamByChannelID(ctx context.Context, channelID pgtype.UUID) (repository.LiveStream, error)
	UpdateLiveStreamTitle(ctx context.Context, arg repository.UpdateLiveStreamTitleParams) (repository.LiveStream, error)
	ListLiveStreams(ctx context.Context) ([]repository.LiveStream, error)
	SetLiveStreamStatus(ctx context.Context, arg repository.SetLiveStreamStatusParams) error
}

type CommunityPostRepository interface {
	CreateCommunityPost(ctx context.Context, arg repository.CreateCommunityPostParams) (repository.CommunityPost, error)
	GetCommunityPostByID(ctx context.Context, id uuid.UUID) (repository.CommunityPost, error)
	ListCommunityPostsByChannel(ctx context.Context, arg repository.ListCommunityPostsByChannelParams) ([]repository.CommunityPost, error)
	DeleteCommunityPost(ctx context.Context, id uuid.UUID) error
	GetCommunityPostLike(ctx context.Context, arg repository.GetCommunityPostLikeParams) (repository.CommunityPostLike, error)
}

type NotificationRepository interface {
	CreateNotification(ctx context.Context, arg repository.CreateNotificationParams) (repository.Notification, error)
	ListNotifications(ctx context.Context, arg repository.ListNotificationsParams) ([]repository.ListNotificationsRow, error)
	CountUnreadNotifications(ctx context.Context, userID pgtype.UUID) (int64, error)
	MarkNotificationRead(ctx context.Context, arg repository.MarkNotificationReadParams) (repository.Notification, error)
}

type CaptionRepository interface {
	CreateCaption(ctx context.Context, arg repository.CreateCaptionParams) (repository.VideoCaption, error)
	GetCaptionByID(ctx context.Context, id uuid.UUID) (repository.VideoCaption, error)
	ListCaptionsByVideo(ctx context.Context, videoID pgtype.UUID) ([]repository.VideoCaption, error)
	DeleteCaption(ctx context.Context, id uuid.UUID) error
}

type ChapterRepository interface {
	CreateChapter(ctx context.Context, arg repository.CreateChapterParams) (repository.VideoChapter, error)
	GetChapterByID(ctx context.Context, id uuid.UUID) (repository.VideoChapter, error)
	ListChaptersByVideo(ctx context.Context, videoID pgtype.UUID) ([]repository.VideoChapter, error)
	DeleteChapter(ctx context.Context, id uuid.UUID) error
}

type AnalyticsRepository interface {
	GetChannelAnalyticsSummary(ctx context.Context, channelID pgtype.UUID) (repository.GetChannelAnalyticsSummaryRow, error)
	ListChannelVideoStats(ctx context.Context, arg repository.ListChannelVideoStatsParams) ([]repository.ListChannelVideoStatsRow, error)
	CountNewSubscribersSince(ctx context.Context, arg repository.CountNewSubscribersSinceParams) (int64, error)
}

type EndScreenRepository interface {
	CreateEndScreen(ctx context.Context, arg repository.CreateEndScreenParams) (repository.VideoEndScreen, error)
	ListEndScreensByVideo(ctx context.Context, videoID uuid.UUID) ([]repository.VideoEndScreen, error)
	GetEndScreenByID(ctx context.Context, id uuid.UUID) (repository.VideoEndScreen, error)
	DeleteEndScreen(ctx context.Context, id uuid.UUID) error
}

// Compile-time guard: PostgresRepository must satisfy Repository in full.
var _ Repository = (*repository.PostgresRepository)(nil)
