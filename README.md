# yiyu

A YouTube-style video platform backend, written in Go.

## Stack

- **Language:** Go
- **Database:** PostgreSQL ([pgx/v5](https://github.com/jackc/pgx))
- **SQL codegen:** [sqlc](https://sqlc.dev/)
- **Migrations:** [goose](https://github.com/pressly/goose)
- **Password hashing:** argon2id (`internal/pkg/password`)
- **Sessions:** server-side, DB-backed, hashed opaque tokens (`internal/pkg/session`)

## Getting started

### Prerequisites

- Go (see `go.mod` for version)
- Docker, for the local Postgres instance
- [goose](https://github.com/pressly/goose) and [sqlc](https://sqlc.dev/) CLIs on your `PATH`

### Setup

```sh
cp .env.example .env
# fill in DATABASE_URL if it differs from the default

make setup-db      # starts Postgres in Docker and applies migrations
```

### Running the API

```sh
DATABASE_URL="postgres://dawit:dawit@localhost:55432/yiyu?sslmode=disable" go run ./cmd/api
```

The server listens on `:8081`.

### Useful Makefile targets

| Target | Description |
|---|---|
| `make docker-up` | Start Postgres in Docker |
| `make docker-down` | Stop Docker services |
| `make migrate-up` | Apply pending migrations |
| `make migrate-down` | Roll back the last migration |
| `make migrate-status` | Show migration status |
| `make setup-db` | Start Postgres and apply all migrations |

### Regenerating SQL code

After editing anything in `internal/adapters/repository/queries/`, regenerate the Go bindings:

```sh
sqlc generate
```

## API

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/signup` | — | Create an account, starts a session |
| `POST` | `/login` | — | Log in, starts a session |
| `POST` | `/logout` | — | Ends the current session |
| `GET` | `/me` | session cookie | Returns the current user |

## Project layout

```
cmd/
  api/            entrypoint for the HTTP server
  worker/         entrypoint for background jobs
internal/
  adapters/
    repository/   Postgres implementation (sqlc-generated + hand-written glue)
  ports/          repository interfaces consumed by the rest of the app
  presentation/
    http/         HTTP handlers and middleware
  pkg/
    password/     argon2id hashing
    session/      session token generation/hashing
migrations/       goose SQL migrations
```

## License

MIT — see [LICENSE](LICENSE).
