-- name: CreateVideo :one
INSERT INTO videos (channel_id, title, description, duration, status, visibility, category, tags, original_url, thumbnail_url)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: GetVideoByID :one
SELECT * FROM videos WHERE id = $1;

-- name: ListVideosByChannel :many
SELECT * FROM videos WHERE channel_id = $1 ORDER BY uploaded_at DESC LIMIT $2 OFFSET $3;

-- name: ClaimNextPendingVideo :one
UPDATE videos
SET status = 'transcoding'
WHERE id = (
    SELECT id FROM videos
    WHERE status = 'processing'
    ORDER BY uploaded_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
)
RETURNING *;

-- name: CompleteVideoProcessing :one
UPDATE videos
SET status = 'ready',
    hls_playlist_url = $2,
    thumbnail_url = COALESCE(NULLIF(thumbnail_url, ''), $3),
    duration = $4,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: FailVideoProcessing :exec
UPDATE videos SET status = 'failed', updated_at = NOW() WHERE id = $1;

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

-- name: ListRelatedVideos :many
-- No ML/recommendation model — just same channel first, then same
-- category, ranked by views. Good enough at this scale.
SELECT * FROM videos
WHERE id != $1
  AND visibility = 'public'
  AND status = 'ready'
  AND (channel_id = $2 OR (category != '' AND category = $3))
ORDER BY (channel_id = $2) DESC, views_count DESC
LIMIT $4;

-- name: AdminListVideos :many
SELECT * FROM videos
ORDER BY uploaded_at DESC
LIMIT $1 OFFSET $2;

-- name: AdminDeleteVideo :exec
DELETE FROM videos WHERE id = $1;

-- name: SearchVideos :many
SELECT videos.id, videos.channel_id, videos.title, videos.description, videos.status, videos.visibility, videos.views_count, videos.likes_count, videos.dislikes_count, videos.thumbnail_url, videos.original_url, videos.hls_playlist_url, videos.category, videos.tags, videos.uploaded_at, videos.published_at, videos.created_at, videos.updated_at, videos.duration
FROM videos
JOIN video_search ON video_search.video_id = videos.id
WHERE video_search.search_vector @@ websearch_to_tsquery('english', $1)
  AND videos.visibility = 'public' AND videos.status = 'ready'
ORDER BY ts_rank(video_search.search_vector, websearch_to_tsquery('english', $1)) DESC
LIMIT $2 OFFSET $3;
