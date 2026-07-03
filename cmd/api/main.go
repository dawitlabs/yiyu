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

	log.Println("listening on :8082")
	log.Fatal(http.ListenAndServe(":8082", mux))
}
