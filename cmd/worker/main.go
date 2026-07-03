package main

import (
	"context"
	"errors"
	"log"
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
			log.Printf("process next video: %v", err)
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

	log.Printf("processing video %s (%q)", video.ID, video.Title)

	if err := transcode(ctx, repo, store, video); err != nil {
		log.Printf("video %s failed: %v", video.ID, err)
		if failErr := repo.FailVideoProcessing(ctx, video.ID); failErr != nil {
			log.Printf("mark video %s failed: %v", video.ID, failErr)
		}
		return true, nil
	}

	log.Printf("video %s ready", video.ID)
	return true, nil
}
