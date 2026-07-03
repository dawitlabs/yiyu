package main

import (
	"context"
	"log"
	"log/slog"
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
	notification := httpapi.NewNotificationHandler(repo)

	requireAuth := httpapi.RequireAuth(repo)
	optionalAuth := httpapi.OptionalAuth(repo)
	requireAdmin := func(h http.Handler) http.Handler {
		return requireAuth(httpapi.RequireAdmin(h))
	}

	// Stricter budget than the general limiter — signup/login are the
	// classic brute-force and spam-account targets.
	authRateLimit := httpapi.RateLimit(10, 5)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		if err := pool.Ping(r.Context()); err != nil {
			http.Error(w, "database unreachable", http.StatusServiceUnavailable)
			return
		}
		w.Write([]byte("ok"))
	})

	mux.Handle("POST /signup", authRateLimit(http.HandlerFunc(auth.Signup)))
	mux.Handle("POST /login", authRateLimit(http.HandlerFunc(auth.Login)))
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
	mux.HandleFunc("GET /videos/{id}/related", video.ListRelatedVideos)
	mux.Handle("POST /videos/{id}/report", requireAuth(http.HandlerFunc(video.ReportVideo)))
	mux.HandleFunc("POST /videos/{id}/view", video.RecordView)
	mux.Handle("POST /videos/{id}/like", requireAuth(http.HandlerFunc(video.LikeVideo)))
	mux.Handle("POST /videos/{id}/dislike", requireAuth(http.HandlerFunc(video.DislikeVideo)))
	mux.Handle("GET /videos/{id}/reaction", requireAuth(http.HandlerFunc(video.GetMyReaction)))
	mux.HandleFunc("GET /channels/{handle}/videos", video.ListVideosByChannel)
	mux.HandleFunc("GET /search", video.SearchVideos)

	mux.Handle("POST /videos/{id}/comments", requireAuth(http.HandlerFunc(comment.CreateComment)))
	mux.HandleFunc("GET /videos/{id}/comments", comment.ListCommentsByVideo)
	mux.HandleFunc("GET /comments/{id}/replies", comment.ListReplies)
	mux.Handle("DELETE /comments/{id}", requireAuth(http.HandlerFunc(comment.DeleteComment)))
	mux.Handle("POST /comments/{id}/report", requireAuth(http.HandlerFunc(comment.ReportComment)))
	mux.Handle("POST /comments/{id}/like", requireAuth(http.HandlerFunc(comment.LikeComment)))
	mux.Handle("GET /comments/{id}/like", requireAuth(http.HandlerFunc(comment.GetMyCommentLike)))

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

	mux.Handle("GET /notifications", requireAuth(http.HandlerFunc(notification.ListNotifications)))
	mux.Handle("GET /notifications/unread-count", requireAuth(http.HandlerFunc(notification.UnreadCount)))
	mux.Handle("POST /notifications/{id}/read", requireAuth(http.HandlerFunc(notification.MarkRead)))

	// General per-IP budget across every route — the stricter auth limiter
	// above still applies underneath this on /signup and /login.
	generalRateLimit := httpapi.RateLimit(120, 30)

	log.Println("listening on :8082")
	log.Fatal(http.ListenAndServe(":8082", generalRateLimit(mux)))
}
