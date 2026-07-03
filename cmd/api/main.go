package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	httpapi "github.com/dawitlabs/yiyu/internal/presentation/http"
)

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

	repo := repository.NewPostgresRepository(pool)
	auth := httpapi.NewAuthHandler(repo)
	admin := httpapi.NewAdminHandler(repo)
	channel := httpapi.NewChannelHandler(repo)
	video := httpapi.NewVideoHandler(repo)

	requireAuth := httpapi.RequireAuth(repo)
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

	mux.Handle("POST /channels", requireAuth(http.HandlerFunc(channel.CreateChannel)))
	mux.Handle("GET /channels/me", requireAuth(http.HandlerFunc(channel.GetMyChannel)))
	mux.HandleFunc("GET /channels/{handle}", channel.GetChannelByHandle)
	mux.Handle("PATCH /channels/{id}", requireAuth(http.HandlerFunc(channel.UpdateChannel)))

	mux.Handle("POST /videos", requireAuth(http.HandlerFunc(video.CreateVideo)))
	mux.HandleFunc("GET /videos", video.ListPublicVideos)
	mux.HandleFunc("GET /videos/{id}", video.GetVideoByID)
	mux.HandleFunc("POST /videos/{id}/view", video.RecordView)
	mux.HandleFunc("GET /channels/{handle}/videos", video.ListVideosByChannel)

	log.Println("listening on :8082")
	log.Fatal(http.ListenAndServe(":8082", mux))
}
