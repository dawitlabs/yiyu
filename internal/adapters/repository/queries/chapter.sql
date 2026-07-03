-- name: CreateChapter :one
INSERT INTO video_chapters (video_id, title, start_seconds)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetChapterByID :one
SELECT * FROM video_chapters WHERE id = $1;

-- name: ListChaptersByVideo :many
SELECT * FROM video_chapters WHERE video_id = $1 ORDER BY start_seconds ASC;

-- name: DeleteChapter :exec
DELETE FROM video_chapters WHERE id = $1;
