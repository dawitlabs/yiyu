-- name: AddWatchLater :exec
INSERT INTO watch_later (user_id, video_id) VALUES ($1, $2)
ON CONFLICT (user_id, video_id) DO NOTHING;

-- name: RemoveWatchLater :exec
DELETE FROM watch_later WHERE user_id = $1 AND video_id = $2;

-- name: IsInWatchLater :one
SELECT EXISTS (
    SELECT 1 FROM watch_later WHERE user_id = $1 AND video_id = $2
);

-- name: ListWatchLater :many
SELECT videos.* FROM watch_later
JOIN videos ON videos.id = watch_later.video_id
WHERE watch_later.user_id = $1
ORDER BY watch_later.created_at DESC
LIMIT $2 OFFSET $3;
