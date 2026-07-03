-- name: CreateCaption :one
INSERT INTO video_captions (video_id, language, label, url, is_default)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetCaptionByID :one
SELECT * FROM video_captions WHERE id = $1;

-- name: ListCaptionsByVideo :many
SELECT * FROM video_captions WHERE video_id = $1 ORDER BY created_at ASC;

-- name: DeleteCaption :exec
DELETE FROM video_captions WHERE id = $1;
