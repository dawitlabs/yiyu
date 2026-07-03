-- name: GetVideoInteraction :one
SELECT * FROM video_interactions WHERE video_id = $1 AND user_id = $2;

-- name: CreateVideoInteraction :one
INSERT INTO video_interactions (video_id, user_id, type) VALUES ($1, $2, $3) RETURNING *;

-- name: UpdateVideoInteractionType :one
UPDATE video_interactions SET type = $3 WHERE video_id = $1 AND user_id = $2 RETURNING *;

-- name: DeleteVideoInteraction :exec
DELETE FROM video_interactions WHERE video_id = $1 AND user_id = $2;

-- name: AdjustVideoReactionCounts :one
UPDATE videos
SET likes_count = likes_count + sqlc.arg(likes_delta)::bigint,
    dislikes_count = dislikes_count + sqlc.arg(dislikes_delta)::bigint
WHERE id = sqlc.arg(id)
RETURNING *;
