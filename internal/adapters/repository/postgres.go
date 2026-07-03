package repository

import (
	"context"

	"github.com/google/uuid"
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

func (r *PostgresRepository) UpdateVideoStatus(ctx context.Context, arg UpdateVideoStatusParams) (Video, error) {
	return r.queries.UpdateVideoStatus(ctx, arg)
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
