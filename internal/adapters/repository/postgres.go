package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	db      *pgxpool.Pool
	queries *Queries
}

func NewPostgresRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{
		db:      db,
		queries: New(db),
	}
}

// WithTx runs fn inside a single Postgres transaction, committing on success
// and rolling back on any error (including a panic, via the deferred
// Rollback — a no-op once Commit has already succeeded).
func (r *PostgresRepository) WithTx(ctx context.Context, fn func(Querier) error) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if err := fn(r.queries.WithTx(tx)); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *PostgresRepository) CreateUser(ctx context.Context, arg CreateUserParams) (User, error) {
	return r.queries.CreateUser(ctx, arg)
}

func (r *PostgresRepository) GetUserByID(ctx context.Context, id uuid.UUID) (User, error) {
	return r.queries.GetUserByID(ctx, id)
}

func (r *PostgresRepository) GetUserByEmail(ctx context.Context, email string) (User, error) {
	return r.queries.GetUserByEmail(ctx, email)
}

func (r *PostgresRepository) GetUserByUsername(ctx context.Context, username string) (User, error) {
	return r.queries.GetUserByUsername(ctx, username)
}

func (r *PostgresRepository) UpdateUser(ctx context.Context, arg UpdateUserParams) (User, error) {
	return r.queries.UpdateUser(ctx, arg)
}

func (r *PostgresRepository) DeleteUser(ctx context.Context, arg DeleteUserParams) (User, error) {
	return r.queries.DeleteUser(ctx, arg)
}

func (r *PostgresRepository) AdminDeleteUser(ctx context.Context, arg AdminDeleteUserParams) error {
	return r.queries.AdminDeleteUser(ctx, arg)
}

func (r *PostgresRepository) AdminGetAllUsers(ctx context.Context, arg AdminGetAllUsersParams) ([]User, error) {
	return r.queries.AdminGetAllUsers(ctx, arg)
}

func (r *PostgresRepository) AdminUpdateUserRole(ctx context.Context, arg AdminUpdateUserRoleParams) (User, error) {
	return r.queries.AdminUpdateUserRole(ctx, arg)
}

func (r *PostgresRepository) CreateSession(ctx context.Context, arg CreateSessionParams) (Session, error) {
	return r.queries.CreateSession(ctx, arg)
}

func (r *PostgresRepository) GetSessionWithUser(ctx context.Context, tokenHash string) (GetSessionWithUserRow, error) {
	return r.queries.GetSessionWithUser(ctx, tokenHash)
}

func (r *PostgresRepository) DeleteSession(ctx context.Context, tokenHash string) error {
	return r.queries.DeleteSession(ctx, tokenHash)
}

func (r *PostgresRepository) DeleteUserSessions(ctx context.Context, userID uuid.UUID) error {
	return r.queries.DeleteUserSessions(ctx, userID)
}

func (r *PostgresRepository) CreateVideo(ctx context.Context, arg CreateVideoParams) (Video, error) {
	return r.queries.CreateVideo(ctx, arg)
}

func (r *PostgresRepository) GetVideoByID(ctx context.Context, id uuid.UUID) (Video, error) {
	return r.queries.GetVideoByID(ctx, id)
}

func (r *PostgresRepository) ListVideosByChannel(ctx context.Context, arg ListVideosByChannelParams) ([]Video, error) {
	return r.queries.ListVideosByChannel(ctx, arg)
}

func (r *PostgresRepository) ClaimNextPendingVideo(ctx context.Context) (Video, error) {
	return r.queries.ClaimNextPendingVideo(ctx)
}

func (r *PostgresRepository) CompleteVideoProcessing(ctx context.Context, arg CompleteVideoProcessingParams) (Video, error) {
	return r.queries.CompleteVideoProcessing(ctx, arg)
}

func (r *PostgresRepository) FailVideoProcessing(ctx context.Context, id uuid.UUID) error {
	return r.queries.FailVideoProcessing(ctx, id)
}

func (r *PostgresRepository) IncrementVideoViews(ctx context.Context, id uuid.UUID) (Video, error) {
	return r.queries.IncrementVideoViews(ctx, id)
}

func (r *PostgresRepository) IncrementVideoLikes(ctx context.Context, id uuid.UUID) (Video, error) {
	return r.queries.IncrementVideoLikes(ctx, id)
}

func (r *PostgresRepository) IncrementVideoDislikes(ctx context.Context, id uuid.UUID) (Video, error) {
	return r.queries.IncrementVideoDislikes(ctx, id)
}

func (r *PostgresRepository) ListPublicVideos(ctx context.Context, arg ListPublicVideosParams) ([]Video, error) {
	return r.queries.ListPublicVideos(ctx, arg)
}

func (r *PostgresRepository) ListRelatedVideos(ctx context.Context, arg ListRelatedVideosParams) ([]Video, error) {
	return r.queries.ListRelatedVideos(ctx, arg)
}

func (r *PostgresRepository) SearchVideos(ctx context.Context, arg SearchVideosParams) ([]Video, error) {
	return r.queries.SearchVideos(ctx, arg)
}

func (r *PostgresRepository) AdminListVideos(ctx context.Context, arg AdminListVideosParams) ([]Video, error) {
	return r.queries.AdminListVideos(ctx, arg)
}

func (r *PostgresRepository) AdminDeleteVideo(ctx context.Context, id uuid.UUID) error {
	return r.queries.AdminDeleteVideo(ctx, id)
}

func (r *PostgresRepository) GetVideoInteraction(ctx context.Context, arg GetVideoInteractionParams) (VideoInteraction, error) {
	return r.queries.GetVideoInteraction(ctx, arg)
}

func (r *PostgresRepository) CreateChannel(ctx context.Context, arg CreateChannelParams) (Channel, error) {
	return r.queries.CreateChannel(ctx, arg)
}

func (r *PostgresRepository) GetChannelByID(ctx context.Context, id uuid.UUID) (Channel, error) {
	return r.queries.GetChannelByID(ctx, id)
}

func (r *PostgresRepository) GetChannelByHandle(ctx context.Context, handle string) (Channel, error) {
	return r.queries.GetChannelByHandle(ctx, handle)
}

func (r *PostgresRepository) GetChannelByUserID(ctx context.Context, userID pgtype.UUID) (Channel, error) {
	return r.queries.GetChannelByUserID(ctx, userID)
}

func (r *PostgresRepository) UpdateChannel(ctx context.Context, arg UpdateChannelParams) (Channel, error) {
	return r.queries.UpdateChannel(ctx, arg)
}

func (r *PostgresRepository) CreateComment(ctx context.Context, arg CreateCommentParams) (Comment, error) {
	return r.queries.CreateComment(ctx, arg)
}

func (r *PostgresRepository) GetCommentByID(ctx context.Context, id uuid.UUID) (Comment, error) {
	return r.queries.GetCommentByID(ctx, id)
}

func (r *PostgresRepository) ListCommentsByVideo(ctx context.Context, arg ListCommentsByVideoParams) ([]ListCommentsByVideoRow, error) {
	return r.queries.ListCommentsByVideo(ctx, arg)
}

func (r *PostgresRepository) ListCommentReplies(ctx context.Context, arg ListCommentRepliesParams) ([]ListCommentRepliesRow, error) {
	return r.queries.ListCommentReplies(ctx, arg)
}

func (r *PostgresRepository) DeleteComment(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteComment(ctx, id)
}

func (r *PostgresRepository) GetCommentLike(ctx context.Context, arg GetCommentLikeParams) (CommentLike, error) {
	return r.queries.GetCommentLike(ctx, arg)
}

func (r *PostgresRepository) GetSubscription(ctx context.Context, arg GetSubscriptionParams) (Subscription, error) {
	return r.queries.GetSubscription(ctx, arg)
}

func (r *PostgresRepository) ListSubscriptionFeed(ctx context.Context, arg ListSubscriptionFeedParams) ([]Video, error) {
	return r.queries.ListSubscriptionFeed(ctx, arg)
}

func (r *PostgresRepository) CreateReport(ctx context.Context, arg CreateReportParams) (Report, error) {
	return r.queries.CreateReport(ctx, arg)
}

func (r *PostgresRepository) AdminListReports(ctx context.Context, arg AdminListReportsParams) ([]AdminListReportsRow, error) {
	return r.queries.AdminListReports(ctx, arg)
}

func (r *PostgresRepository) AdminUpdateReportStatus(ctx context.Context, arg AdminUpdateReportStatusParams) (Report, error) {
	return r.queries.AdminUpdateReportStatus(ctx, arg)
}

func (r *PostgresRepository) UpsertWatchHistory(ctx context.Context, arg UpsertWatchHistoryParams) (WatchHistory, error) {
	return r.queries.UpsertWatchHistory(ctx, arg)
}

func (r *PostgresRepository) ListWatchHistory(ctx context.Context, arg ListWatchHistoryParams) ([]Video, error) {
	return r.queries.ListWatchHistory(ctx, arg)
}

func (r *PostgresRepository) CreatePlaylist(ctx context.Context, arg CreatePlaylistParams) (Playlist, error) {
	return r.queries.CreatePlaylist(ctx, arg)
}

func (r *PostgresRepository) GetPlaylistByID(ctx context.Context, id uuid.UUID) (Playlist, error) {
	return r.queries.GetPlaylistByID(ctx, id)
}

func (r *PostgresRepository) ListPlaylistsByChannel(ctx context.Context, arg ListPlaylistsByChannelParams) ([]Playlist, error) {
	return r.queries.ListPlaylistsByChannel(ctx, arg)
}

func (r *PostgresRepository) DeletePlaylist(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeletePlaylist(ctx, id)
}

func (r *PostgresRepository) AddVideoToPlaylist(ctx context.Context, arg AddVideoToPlaylistParams) (PlaylistVideo, error) {
	return r.queries.AddVideoToPlaylist(ctx, arg)
}

func (r *PostgresRepository) RemoveVideoFromPlaylist(ctx context.Context, arg RemoveVideoFromPlaylistParams) error {
	return r.queries.RemoveVideoFromPlaylist(ctx, arg)
}

func (r *PostgresRepository) ListPlaylistVideos(ctx context.Context, id uuid.UUID) ([]Video, error) {
	return r.queries.ListPlaylistVideos(ctx, id)
}

func (r *PostgresRepository) ListAllPlaylistsByChannel(ctx context.Context, arg ListAllPlaylistsByChannelParams) ([]Playlist, error) {
	return r.queries.ListAllPlaylistsByChannel(ctx, arg)
}

func (r *PostgresRepository) CreateNotification(ctx context.Context, arg CreateNotificationParams) (Notification, error) {
	return r.queries.CreateNotification(ctx, arg)
}

func (r *PostgresRepository) ListNotifications(ctx context.Context, arg ListNotificationsParams) ([]ListNotificationsRow, error) {
	return r.queries.ListNotifications(ctx, arg)
}

func (r *PostgresRepository) CountUnreadNotifications(ctx context.Context, userID pgtype.UUID) (int64, error) {
	return r.queries.CountUnreadNotifications(ctx, userID)
}

func (r *PostgresRepository) MarkNotificationRead(ctx context.Context, arg MarkNotificationReadParams) (Notification, error) {
	return r.queries.MarkNotificationRead(ctx, arg)
}

func (r *PostgresRepository) CreateCaption(ctx context.Context, arg CreateCaptionParams) (VideoCaption, error) {
	return r.queries.CreateCaption(ctx, arg)
}

func (r *PostgresRepository) GetCaptionByID(ctx context.Context, id uuid.UUID) (VideoCaption, error) {
	return r.queries.GetCaptionByID(ctx, id)
}

func (r *PostgresRepository) ListCaptionsByVideo(ctx context.Context, videoID pgtype.UUID) ([]VideoCaption, error) {
	return r.queries.ListCaptionsByVideo(ctx, videoID)
}

func (r *PostgresRepository) DeleteCaption(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteCaption(ctx, id)
}

func (r *PostgresRepository) CreateChapter(ctx context.Context, arg CreateChapterParams) (VideoChapter, error) {
	return r.queries.CreateChapter(ctx, arg)
}

func (r *PostgresRepository) GetChapterByID(ctx context.Context, id uuid.UUID) (VideoChapter, error) {
	return r.queries.GetChapterByID(ctx, id)
}

func (r *PostgresRepository) ListChaptersByVideo(ctx context.Context, videoID pgtype.UUID) ([]VideoChapter, error) {
	return r.queries.ListChaptersByVideo(ctx, videoID)
}

func (r *PostgresRepository) DeleteChapter(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteChapter(ctx, id)
}
