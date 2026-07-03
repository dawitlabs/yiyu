-- name: CreateChannel :one
INSERT INTO channels (user_id, handle, name, description, avatar_url, banner_url)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetChannelByID :one
SELECT * FROM channels WHERE id = $1;

-- name: GetChannelByHandle :one
SELECT * FROM channels WHERE handle = $1;

-- name: GetChannelByUserID :one
SELECT * FROM channels WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1;

-- name: UpdateChannel :one
UPDATE channels
SET name = $2,
    description = $3,
    avatar_url = $4,
    banner_url = $5,
    updated_at = NOW()
WHERE id = $1
RETURNING *;
