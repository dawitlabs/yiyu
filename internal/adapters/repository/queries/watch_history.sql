-- name: UpsertWatchHistory :one
INSERT INTO watch_history (user_id, video_id, progress, completed)
VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id, video_id) DO UPDATE SET
    progress = EXCLUDED.progress,
    completed = EXCLUDED.completed,
    watched_at = NOW()
RETURNING *;

-- name: ListWatchHistory :many
SELECT videos.*
FROM watch_history
JOIN videos ON videos.id = watch_history.video_id
WHERE watch_history.user_id = $1
ORDER BY watch_history.watched_at DESC
LIMIT $2 OFFSET $3;
