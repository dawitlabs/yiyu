-- name: GetChannelAnalyticsSummary :one
SELECT
    COALESCE(SUM(views_count), 0)::bigint AS total_views,
    COALESCE(SUM(likes_count), 0)::bigint AS total_likes,
    COALESCE(SUM(dislikes_count), 0)::bigint AS total_dislikes,
    COUNT(*)::bigint AS total_videos
FROM videos
WHERE channel_id = $1;

-- name: ListChannelVideoStats :many
SELECT id, title, views_count, likes_count, dislikes_count, uploaded_at
FROM videos
WHERE channel_id = $1
ORDER BY views_count DESC
LIMIT $2 OFFSET $3;

-- name: CountNewSubscribersSince :one
SELECT count(*) FROM subscriptions WHERE channel_id = $1 AND created_at >= $2;
