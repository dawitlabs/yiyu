-- name: CreateVideo :one
INSERT INTO videos (channel_id, title, description, duration, status, visibility, category, tags, original_url, thumbnail_url)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: GetVideoByID :one
SELECT * FROM videos WHERE id = $1;

-- name: ListVideosByChannel :many
SELECT * FROM videos WHERE channel_id = $1 ORDER BY uploaded_at DESC LIMIT $2 OFFSET $3;

-- name: UpdateVideoStatus :one
UPDATE videos SET status = $2, hls_playlist_url = $3, thumbnail_url = $4, updated_at = NOW() WHERE id = $1 RETURNING *;

-- name: IncrementVideoViews :one
UPDATE videos SET views_count = views_count + 1 WHERE id = $1 RETURNING *;

-- name: IncrementVideoLikes :one
UPDATE videos SET likes_count = likes_count + 1 WHERE id = $1 RETURNING *;

-- name: IncrementVideoDislikes :one
UPDATE videos SET dislikes_count = dislikes_count + 1 WHERE id = $1 RETURNING *;

-- name: ListPublicVideos :many
SELECT * FROM videos
WHERE visibility = 'public' AND status = 'ready'
ORDER BY uploaded_at DESC
LIMIT $1 OFFSET $2;


