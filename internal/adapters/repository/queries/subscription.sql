-- name: CreateSubscription :one
INSERT INTO subscriptions (channel_id, user_id) VALUES ($1, $2) RETURNING *;

-- name: DeleteSubscription :exec
DELETE FROM subscriptions WHERE channel_id = $1 AND user_id = $2;

-- name: GetSubscription :one
SELECT * FROM subscriptions WHERE channel_id = $1 AND user_id = $2;

-- name: AdjustChannelSubscriberCount :one
UPDATE channels
SET subscriber_count = subscriber_count + sqlc.arg(delta)::bigint
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: ListSubscriptionFeed :many
SELECT videos.*
FROM videos
JOIN subscriptions ON subscriptions.channel_id = videos.channel_id
WHERE subscriptions.user_id = $1
  AND videos.visibility = 'public'
  AND videos.status = 'ready'
ORDER BY videos.uploaded_at DESC
LIMIT $2 OFFSET $3;
