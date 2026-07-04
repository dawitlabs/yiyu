# yiyu

A YouTube-style video platform backend, written in Go.

## Stack

- **Language:** Go
- **Database:** PostgreSQL ([pgx/v5](https://github.com/jackc/pgx))
- **SQL codegen:** [sqlc](https://sqlc.dev/)
- **Migrations:** [goose](https://github.com/pressly/goose)
- **Password hashing:** argon2id (`internal/pkg/password`)
- **Sessions:** server-side, DB-backed, hashed opaque tokens (`internal/pkg/session`)
- **Object storage:** S3-compatible (MinIO locally, swappable for R2/S3 in production), presigned direct uploads (`internal/pkg/storage`)
- **Search:** Postgres full-text search (`tsvector` + GIN index, `websearch_to_tsquery`)
- **Video processing:** `cmd/worker` polls for pending uploads and transcodes them (ffmpeg/ffprobe via `os/exec`) — duration, thumbnail, adaptive-bitrate HLS (1080p/720p/480p ladder, capped by source resolution)
- **Auto-captions (optional):** if `WHISPER_MODEL` is set, the worker runs a local [whisper.cpp](https://github.com/ggml-org/whisper.cpp) model over each upload's audio and saves the result as a caption track, language auto-detected
- **Live streaming (optional):** [MediaMTX](https://github.com/bluenviron/mediamtx) (in `docker-compose.yml`) handles RTMP ingest and HLS packaging; `cmd/api` issues per-channel stream keys and reverse-proxies HLS playback so the secret key is never sent to viewers, `cmd/worker` polls MediaMTX's status API to flip a channel live/offline

## Getting started

### Prerequisites

- Go (see `go.mod` for version)
- Docker, for local Postgres + MinIO
- [goose](https://github.com/pressly/goose) and [sqlc](https://sqlc.dev/) CLIs on your `PATH`
- `ffmpeg` and `ffprobe` on your `PATH`, for `cmd/worker`
- (optional) [whisper.cpp](https://github.com/ggml-org/whisper.cpp) built as `whisper-cli` on your `PATH`, plus a ggml model file, for auto-captions — see `WHISPER_MODEL` below

### Setup

```sh
cp .env.example .env
# fill in DATABASE_URL / STORAGE_* if they differ from the defaults

make setup-db      # starts Postgres + MinIO in Docker and applies migrations
```

### Running the API

```sh
DATABASE_URL="postgres://dawit:dawit@localhost:55432/yiyu?sslmode=disable" go run ./cmd/api
```

The server listens on `:8082`.

### Running the worker

Uploaded videos sit at `status: "processing"` until this runs — without it, videos never get a duration, thumbnail, or HLS output (they're still watchable via `original_url` in the meantime).

```sh
DATABASE_URL="postgres://dawit:dawit@localhost:55432/yiyu?sslmode=disable" go run ./cmd/worker
```

### Useful Makefile targets

| Target | Description |
|---|---|
| `make docker-up` | Start Postgres in Docker |
| `make docker-down` | Stop Docker services |
| `make migrate-up` | Apply pending migrations |
| `make migrate-down` | Roll back the last migration |
| `make migrate-status` | Show migration status |
| `make seed-admin EMAIL=you@example.com` | Promote an existing signed-up account to `admin` |
| `make setup-db` | Start Postgres and apply all migrations |

### Regenerating SQL code

After editing anything in `internal/adapters/repository/queries/`, regenerate the Go bindings:

```sh
sqlc generate
```

## API

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/signup` | — | Create an account, starts a session |
| `POST` | `/login` | — | Log in, starts a session |
| `POST` | `/logout` | — | Ends the current session |
| `GET` | `/me` | session cookie | Returns the current user (incl. `role`) |

### Channels

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/channels` | session | Create a channel (one per user, DB-enforced) |
| `GET` | `/channels` | — | Channel directory, ranked by subscriber count — the browse/discovery entry point |
| `GET` | `/channels/me` | session | The caller's own channel |
| `GET` | `/channels/{handle}` | — | Public channel lookup |
| `PATCH` | `/channels/{id}` | session, owner-only | Update name/description/avatar/banner |
| `POST`/`DELETE` | `/channels/{id}/subscribe` | session | Subscribe / unsubscribe |
| `GET` | `/channels/{id}/subscription` | session | Caller's subscription status |

### Videos

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/uploads/presign` | session | Presigned direct-upload URL + resulting public URL |
| `POST` | `/videos` | session | Create a video (`original_url` from an upload or an external link); starts at `status: "processing"` |
| `GET` | `/videos` | optional session | Home feed (paginated) — recency for anonymous callers, boosted by the caller's subscriptions and watched categories when logged in |
| `GET` | `/videos/{id}` | — | Get a video |
| `GET` | `/channels/{handle}/videos` | — | A channel's videos |
| `GET` | `/search?q=` | — | Full-text search |
| `GET` | `/feed/subscriptions` | session | Videos from subscribed channels |
| `POST` | `/videos/{id}/view` | — | Record a view |
| `POST` | `/videos/{id}/like` \| `/dislike` | session | Toggle reaction |
| `GET` | `/videos/{id}/reaction` | session | Caller's current reaction |

### Comments

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/videos/{id}/comments` | session | Post a comment |
| `GET` | `/videos/{id}/comments` | — | List comments |
| `DELETE` | `/comments/{id}` | session, author or admin | Soft-delete a comment |

### Community posts

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/channels/{id}/posts` | session, owner-only | Post a text (+ optional image) update to a channel |
| `GET` | `/channels/{handle}/posts` | — | List a channel's posts |
| `DELETE` | `/posts/{id}` | session, owner or admin | Delete a post |
| `POST` | `/posts/{id}/like` | session | Toggle the caller's like |

### Live streaming

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/channels/{id}/live/key` | session, owner-only | Issue a fresh RTMP stream key, invalidating the previous one. Returned once — not retrievable afterward |
| `PATCH` | `/channels/{id}/live` | session, owner-only | Set the live stream's title |
| `GET` | `/channels/{handle}/live` | — | `{ is_live, title, hls_url }` — poll this for the "LIVE" badge |
| `GET` | `/live/{handle}/{file}` | — | Reverse-proxies HLS playback from MediaMTX; 404s when the channel isn't live |

To go live: paste the returned `rtmp_server` and `stream_key` into OBS (Settings → Stream → Custom), start streaming, and `cmd/worker`'s poller flips the channel live within one poll interval (5s) once MediaMTX reports the RTMP path as ready.

### Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/users` | admin | List users (paginated) |
| `PATCH` | `/admin/users/{id}/role` | admin | Change a user's role |
| `DELETE` | `/admin/users/{id}` | admin | Soft-delete a user, kill their sessions |
| `GET` | `/admin/videos` | admin | List all videos |
| `DELETE` | `/admin/videos/{id}` | admin | Hard-delete a video |

There's no self-serve way to become an admin — sign up normally, then run
`make seed-admin EMAIL=you@example.com` to promote that account.

## Project layout

```
cmd/
  api/            entrypoint for the HTTP server
  worker/         polls for pending videos and transcodes them
internal/
  adapters/
    repository/   Postgres implementation (sqlc-generated + hand-written glue)
  ports/          repository interfaces consumed by the rest of the app
  presentation/
    http/         HTTP handlers and middleware
  pkg/
    password/     argon2id hashing
    session/      session token generation/hashing
    storage/      S3-compatible object storage client
migrations/       goose SQL migrations
web/              Next.js public client
admin/            Next.js admin dashboard
```

## License

MIT — see [LICENSE](LICENSE).
