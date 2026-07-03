package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	"github.com/dawitlabs/yiyu/internal/pkg/storage"
	httpapi "github.com/dawitlabs/yiyu/internal/presentation/http"
)

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
		log.Fatalf("ping databse: %v", err)
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
	auth := httpapi.NewAuthHandler(repo)
	admin := httpapi.NewAdminHandler(repo)
	channel := httpapi.NewChannelHandler(repo)
	video := httpapi.NewVideoHandler(repo)
	comment := httpapi.NewCommentHandler(repo)
	upload := httpapi.NewUploadHandler(storageClient)
	subscription := httpapi.NewSubscriptionHandler(repo)
	watchHistory := httpapi.NewWatchHistoryHandler(repo)
	playlist := httpapi.NewPlaylistHandler(repo)

	requireAuth := httpapi.RequireAuth(repo)
	optionalAuth := httpapi.OptionalAuth(repo)
	requireAdmin := func(h http.Handler) http.Handler {
		return requireAuth(httpapi.RequireAdmin(h))
	}

	mux := http.NewServeMux()
	mux.HandleFunc("POST /signup", auth.Signup)
	mux.HandleFunc("POST /login", auth.Login)
	mux.HandleFunc("POST /logout", auth.Logout)
	mux.Handle("GET /me", requireAuth(http.HandlerFunc(auth.Me)))

	mux.Handle("GET /admin/users", requireAdmin(http.HandlerFunc(admin.ListUsers)))
	mux.Handle("DELETE /admin/users/{id}", requireAdmin(http.HandlerFunc(admin.DeleteUser)))
	mux.Handle("PATCH /admin/users/{id}/role", requireAdmin(http.HandlerFunc(admin.UpdateUserRole)))
	mux.Handle("GET /admin/videos", requireAdmin(http.HandlerFunc(admin.ListVideos)))
	mux.Handle("DELETE /admin/videos/{id}", requireAdmin(http.HandlerFunc(admin.DeleteVideo)))
	mux.Handle("GET /admin/reports", requireAdmin(http.HandlerFunc(admin.ListReports)))
	mux.Handle("PATCH /admin/reports/{id}", requireAdmin(http.HandlerFunc(admin.UpdateReportStatus)))

	mux.Handle("POST /channels", requireAuth(http.HandlerFunc(channel.CreateChannel)))
	mux.Handle("GET /channels/me", requireAuth(http.HandlerFunc(channel.GetMyChannel)))
	mux.HandleFunc("GET /channels/{handle}", channel.GetChannelByHandle)
	mux.Handle("PATCH /channels/{id}", requireAuth(http.HandlerFunc(channel.UpdateChannel)))

	mux.Handle("POST /videos", requireAuth(http.HandlerFunc(video.CreateVideo)))
	mux.HandleFunc("GET /videos", video.ListPublicVideos)
	mux.HandleFunc("GET /videos/{id}", video.GetVideoByID)
	mux.Handle("POST /videos/{id}/report", requireAuth(http.HandlerFunc(video.ReportVideo)))
	mux.HandleFunc("POST /videos/{id}/view", video.RecordView)
	mux.Handle("POST /videos/{id}/like", requireAuth(http.HandlerFunc(video.LikeVideo)))
	mux.Handle("POST /videos/{id}/dislike", requireAuth(http.HandlerFunc(video.DislikeVideo)))
	mux.Handle("GET /videos/{id}/reaction", requireAuth(http.HandlerFunc(video.GetMyReaction)))
	mux.HandleFunc("GET /channels/{handle}/videos", video.ListVideosByChannel)
	mux.HandleFunc("GET /search", video.SearchVideos)

	mux.Handle("POST /videos/{id}/comments", requireAuth(http.HandlerFunc(comment.CreateComment)))
	mux.HandleFunc("GET /videos/{id}/comments", comment.ListCommentsByVideo)
	mux.Handle("DELETE /comments/{id}", requireAuth(http.HandlerFunc(comment.DeleteComment)))
	mux.Handle("POST /comments/{id}/report", requireAuth(http.HandlerFunc(comment.ReportComment)))

	mux.Handle("POST /uploads/presign", requireAuth(http.HandlerFunc(upload.PresignUpload)))

	mux.Handle("POST /channels/{id}/subscribe", requireAuth(http.HandlerFunc(subscription.Subscribe)))
	mux.Handle("DELETE /channels/{id}/subscribe", requireAuth(http.HandlerFunc(subscription.Unsubscribe)))
	mux.Handle("GET /channels/{id}/subscription", requireAuth(http.HandlerFunc(subscription.GetSubscriptionStatus)))
	mux.Handle("GET /feed/subscriptions", requireAuth(http.HandlerFunc(subscription.GetFeed)))

	mux.Handle("POST /videos/{id}/progress", requireAuth(http.HandlerFunc(watchHistory.RecordProgress)))
	mux.Handle("GET /history", requireAuth(http.HandlerFunc(watchHistory.ListHistory)))

	mux.Handle("POST /playlists", requireAuth(http.HandlerFunc(playlist.CreatePlaylist)))
	mux.Handle("GET /channels/{handle}/playlists", optionalAuth(http.HandlerFunc(playlist.ListPlaylistsByChannel)))
	mux.Handle("GET /playlists/{id}", optionalAuth(http.HandlerFunc(playlist.GetPlaylist)))
	mux.Handle("DELETE /playlists/{id}", requireAuth(http.HandlerFunc(playlist.DeletePlaylist)))
	mux.Handle("POST /playlists/{id}/videos", requireAuth(http.HandlerFunc(playlist.AddVideo)))
	mux.Handle("DELETE /playlists/{id}/videos/{videoId}", requireAuth(http.HandlerFunc(playlist.RemoveVideo)))

	log.Println("listening on :8082")
	log.Fatal(http.ListenAndServe(":8082", mux))
}
