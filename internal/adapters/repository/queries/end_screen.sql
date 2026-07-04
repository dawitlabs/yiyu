-- name: CreateEndScreen :one
INSERT INTO video_end_screens (video_id, type, target_id, start_seconds, position_x, position_y)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListEndScreensByVideo :many
SELECT * FROM video_end_screens
WHERE video_id = $1
ORDER BY start_seconds ASC;

-- name: DeleteEndScreen :exec
DELETE FROM video_end_screens WHERE id = $1;

-- name: GetEndScreenByID :one
SELECT * FROM video_end_screens WHERE id = $1;
