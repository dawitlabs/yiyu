-- name: CreateComment :one
INSERT INTO comments (video_id, user_id, content, parent_id)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetCommentByID :one
SELECT * FROM comments WHERE id = $1;

-- name: ListCommentsByVideo :many
-- Top-level only (parent_id IS NULL) — replies are fetched separately via
-- ListCommentReplies, not mixed flat into the same list.
SELECT sqlc.embed(comments), sqlc.embed(users)
FROM comments
JOIN users ON users.id = comments.user_id
WHERE comments.video_id = $1 AND comments.is_deleted = false AND comments.parent_id IS NULL
ORDER BY comments.created_at DESC
LIMIT $2 OFFSET $3;

-- name: ListCommentReplies :many
SELECT sqlc.embed(comments), sqlc.embed(users)
FROM comments
JOIN users ON users.id = comments.user_id
WHERE comments.parent_id = $1 AND comments.is_deleted = false
ORDER BY comments.created_at ASC
LIMIT $2 OFFSET $3;

-- name: DeleteComment :exec
UPDATE comments SET is_deleted = true, updated_at = NOW() WHERE id = $1;
