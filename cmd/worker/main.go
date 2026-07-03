package main

import (
	"context"
	"errors"
	"log"
	"log/slog"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	"github.com/dawitlabs/yiyu/internal/pkg/storage"
)

const pollInterval = 5 * time.Second

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

	ctx := context.Background()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required")
	}

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatalf("connect to database: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("ping database: %v", err)
	}
	log.Println("connected to database")

	storageClient, err := storage.New(storage.Config{
		Endpoint:   getEnv("STORAGE_ENDPOINT", "localhost:9002"),
		AccessKey:  getEnv("STORAGE_ACCESS_KEY", "dawit"),
		SecretKey:  getEnv("STORAGE_SECRET_KEY", "dawitdawit"),
		Bucket:     getEnv("STORAGE_BUCKET", "yiyu-videos"),
		PublicBase: getEnv("STORAGE_PUBLIC_BASE_URL", "http://localhost:9002/yiyu-videos"),
		UseSSL:     os.Getenv("STORAGE_USE_SSL") == "true",
	})
	if err != nil {
		log.Fatalf("init storage client: %v", err)
	}

	repo := repository.NewPostgresRepository(pool)

	log.Println("worker started, polling for videos to process")
	for {
		processed, err := processNext(ctx, repo, storageClient)
		if err != nil {
			slog.Error("process next video", "error", err)
		}
		if !processed {
			time.Sleep(pollInterval)
		}
	}
}

// processNext claims and processes one video. Returns false only when there
// was nothing to do, so the caller knows whether to sleep before polling
// again or go straight to the next one.
func processNext(ctx context.Context, repo *repository.PostgresRepository, store *storage.Client) (bool, error) {
	video, err := repo.ClaimNextPendingVideo(ctx)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	slog.Info("processing video", "video_id", video.ID, "title", video.Title)

	if err := transcode(ctx, repo, store, video); err != nil {
		slog.Error("video processing failed", "video_id", video.ID, "error", err)
		if failErr := repo.FailVideoProcessing(ctx, video.ID); failErr != nil {
			slog.Error("mark video failed", "video_id", video.ID, "error", failErr)
		}
		return true, nil
	}

	slog.Info("video ready", "video_id", video.ID)
	return true, nil
}
