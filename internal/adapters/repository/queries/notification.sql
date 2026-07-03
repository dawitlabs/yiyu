-- name: CreateNotification :one
INSERT INTO notifications (user_id, type, actor_id, video_id, comment_id)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListNotifications :many
SELECT
    notifications.id, notifications.type, notifications.video_id, notifications.comment_id,
    notifications.is_read, notifications.created_at,
    actor.username AS actor_username,
    videos.title AS video_title
FROM notifications
LEFT JOIN users actor ON actor.id = notifications.actor_id
LEFT JOIN videos ON videos.id = notifications.video_id
WHERE notifications.user_id = $1
ORDER BY notifications.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountUnreadNotifications :one
SELECT count(*) FROM notifications WHERE user_id = $1 AND is_read = false;

-- name: MarkNotificationRead :one
UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *;
