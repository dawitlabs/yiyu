package repository

import (
	"context"
	"fmt"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()

	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://dawit:dawit@localhost:55432/yiyu?sslmode=disable"
	}

	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Fatalf("connect to test database: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func createTestUser(t *testing.T, ctx context.Context, repo *PostgresRepository, pool *pgxpool.Pool) User {
	t.Helper()

	suffix := uuid.New().String()[:8]
	arg := CreateUserParams{
		Username:     "tdduser_" + suffix,
		Email:        fmt.Sprintf("tdduser_%s@example.com", suffix),
		PasswordHash: "hashed-password",
		Role:         UserRoleUser,
	}

	user, err := repo.CreateUser(ctx, arg)
	if err != nil {
		t.Fatalf("createTestUser: CreateUser() error = %v", err)
	}
	t.Cleanup(func() {
		pool.Exec(context.Background(), "DELETE FROM users WHERE id = $1", user.ID)
	})
	return user
}

func TestPostgresRepository_CreateUser(t *testing.T) {
	pool := testPool(t)
	repo := NewPostgresRepository(pool)
	ctx := context.Background()

	suffix := uuid.New().String()[:8]
	arg := CreateUserParams{
		Username:     "tdduser_" + suffix,
		Email:        fmt.Sprintf("tdduser_%s@example.com", suffix),
		PasswordHash: "hashed-password",
		Role:         UserRoleUser,
	}

	got, err := repo.CreateUser(ctx, arg)
	if err != nil {
		t.Fatalf("CreateUser() error = %v", err)
	}
	t.Cleanup(func() {
		pool.Exec(context.Background(), "DELETE FROM users WHERE id = $1", got.ID)
	})

	if got.ID == uuid.Nil {
		t.Error("CreateUser() returned zero ID")
	}
	if got.Username != arg.Username {
		t.Errorf("Username = %q, want %q", got.Username, arg.Username)
	}
	if got.Email != arg.Email {
		t.Errorf("Email = %q, want %q", got.Email, arg.Email)
	}
	if !got.IsActive.Bool {
		t.Error("IsActive = false, want true")
	}
	if got.DeletedAt.Valid {
		t.Error("DeletedAt should be unset for a new user")
	}
}

func TestPostgresRepository_GetUserByID(t *testing.T) {
	pool := testPool(t)
	repo := NewPostgresRepository(pool)
	ctx := context.Background()

	created := createTestUser(t, ctx, repo, pool)

	got, err := repo.GetUserByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("GetUserByID() error = %v", err)
	}

	if got.ID != created.ID {
		t.Errorf("ID = %v, want %v", got.ID, created.ID)
	}
	if got.Username != created.Username {
		t.Errorf("Username = %q, want %q", got.Username, created.Username)
	}
	if got.Email != created.Email {
		t.Errorf("Email = %q, want %q", got.Email, created.Email)
	}
}

func TestPostgresRepository_GetUserByEmail(t *testing.T) {
	pool := testPool(t)
	repo := NewPostgresRepository(pool)
	ctx := context.Background()

	created := createTestUser(t, ctx, repo, pool)

	got, err := repo.GetUserByEmail(ctx, created.Email)
	if err != nil {
		t.Fatalf("GetUserByEmail() error = %v", err)
	}

	if got.ID != created.ID {
		t.Errorf("ID = %v, want %v", got.ID, created.ID)
	}
	if got.Username != created.Username {
		t.Errorf("Username = %q, want %q", got.Username, created.Username)
	}
}

func TestPostgresRepository_GetUserByUsername(t *testing.T) {
	pool := testPool(t)
	repo := NewPostgresRepository(pool)
	ctx := context.Background()

	created := createTestUser(t, ctx, repo, pool)

	got, err := repo.GetUserByUsername(ctx, created.Username)
	if err != nil {
		t.Fatalf("GetUserByUsername() error = %v", err)
	}

	if got.ID != created.ID {
		t.Errorf("ID = %v, want %v", got.ID, created.ID)
	}
	if got.Email != created.Email {
		t.Errorf("Email = %q, want %q", got.Email, created.Email)
	}
}

func TestPostgresRepository_UpdateUser(t *testing.T) {
	pool := testPool(t)
	repo := NewPostgresRepository(pool)
	ctx := context.Background()

	created := createTestUser(t, ctx, repo, pool)

	arg := UpdateUserParams{
		ID:          created.ID,
		DisplayName: pgtype.Text{String: "Updated Name", Valid: true},
		Bio:         pgtype.Text{String: "Updated bio", Valid: true},
		AvatarUrl:   pgtype.Text{String: "https://example.com/avatar.png", Valid: true},
	}

	got, err := repo.UpdateUser(ctx, arg)
	if err != nil {
		t.Fatalf("UpdateUser() error = %v", err)
	}

	if got.DisplayName.String != arg.DisplayName.String {
		t.Errorf("DisplayName = %q, want %q", got.DisplayName.String, arg.DisplayName.String)
	}
	if got.Bio.String != arg.Bio.String {
		t.Errorf("Bio = %q, want %q", got.Bio.String, arg.Bio.String)
	}
	if got.AvatarUrl.String != arg.AvatarUrl.String {
		t.Errorf("AvatarUrl = %q, want %q", got.AvatarUrl.String, arg.AvatarUrl.String)
	}
}

func TestPostgresRepository_DeleteUser(t *testing.T) {
	pool := testPool(t)
	repo := NewPostgresRepository(pool)
	ctx := context.Background()

	created := createTestUser(t, ctx, repo, pool)

	arg := DeleteUserParams{
		ID:        created.ID,
		DeletedBy: pgtype.UUID{Bytes: created.ID, Valid: true},
	}

	got, err := repo.DeleteUser(ctx, arg)
	if err != nil {
		t.Fatalf("DeleteUser() error = %v", err)
	}

	if !got.DeletedAt.Valid {
		t.Error("DeletedAt should be set after delete")
	}
	if got.IsActive.Bool {
		t.Error("IsActive = true, want false after delete")
	}
	if got.DeletedBy != arg.DeletedBy {
		t.Errorf("DeletedBy = %v, want %v", got.DeletedBy, arg.DeletedBy)
	}

	if _, err := repo.GetUserByID(ctx, created.ID); err == nil {
		t.Error("GetUserByID() should fail for a deleted user")
	}
}
