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
    is_short = $5,
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

-- name: ListPersonalizedFeed :many
-- Same recency-ranked pool as ListPublicVideos, boosted by two signals
-- already in the schema: subscribed channels and categories the user
-- actually watches. No ML model — good enough at this scale, and every
-- signal here already has an index (subscriptions.user_id, watch_history.user_id).
WITH watched_categories AS (
    SELECT v.category, COUNT(*) AS watch_count
    FROM watch_history wh
    JOIN videos v ON v.id = wh.video_id
    WHERE wh.user_id = $1 AND v.category != ''
    GROUP BY v.category
)
SELECT v.* FROM videos v
LEFT JOIN watched_categories wc ON wc.category = v.category
WHERE v.visibility = 'public' AND v.status = 'ready'
ORDER BY
    (v.channel_id IN (SELECT s.channel_id FROM subscriptions s WHERE s.user_id = $1)) DESC,
    COALESCE(wc.watch_count, 0) DESC,
    v.uploaded_at DESC
LIMIT $2 OFFSET $3;

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

-- name: ListLikedVideosByUser :many
SELECT videos.* FROM video_interactions
JOIN videos ON videos.id = video_interactions.video_id
WHERE video_interactions.user_id = $1 AND video_interactions.type = 'like'
ORDER BY video_interactions.created_at DESC
LIMIT $2 OFFSET $3;

-- name: ListTrendingVideos :many
-- No view-event log exists (views_count is a running counter), so recency
-- is approximated by upload window rather than true view-velocity — good
-- enough at this scale, and needs no new schema.
SELECT * FROM videos
WHERE visibility = 'public' AND status = 'ready'
  AND uploaded_at > NOW() - INTERVAL '7 days'
ORDER BY views_count DESC
LIMIT $1;

-- name: SuggestVideoTitles :many
SELECT DISTINCT title FROM videos
WHERE visibility = 'public' AND status = 'ready'
  AND lower(title) LIKE lower($1) || '%'
LIMIT 8;

-- name: UpdateVideo :one
UPDATE videos
SET title = $2,
    description = $3,
    thumbnail_url = $4,
    category = $5,
    tags = $6,
    visibility = $7,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ListShorts :many
SELECT * FROM videos
WHERE visibility = 'public' AND status = 'ready' AND is_short = true
ORDER BY uploaded_at DESC
LIMIT $1 OFFSET $2;

-- name: AdminListVideos :many
SELECT * FROM videos
ORDER BY uploaded_at DESC
LIMIT $1 OFFSET $2;

-- name: AdminDeleteVideo :exec
DELETE FROM videos WHERE id = $1;

-- name: SearchVideos :many
SELECT videos.*
FROM videos
JOIN video_search ON video_search.video_id = videos.id
WHERE video_search.search_vector @@ websearch_to_tsquery('english', $1)
  AND videos.visibility = 'public' AND videos.status = 'ready'
ORDER BY ts_rank(video_search.search_vector, websearch_to_tsquery('english', $1)) DESC
LIMIT $2 OFFSET $3;
