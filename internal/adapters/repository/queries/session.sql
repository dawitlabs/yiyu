-- name: CreateSession :one
INSERT INTO sessions (token_hash, user_id, expires_at)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetSessionWithUser :one
SELECT sqlc.embed(sessions), sqlc.embed(users)
FROM sessions
JOIN users ON users.id = sessions.user_id
WHERE sessions.token_hash = $1
  AND sessions.expires_at > NOW()
  AND users.deleted_at IS NULL;

-- name: DeleteSession :exec
DELETE FROM sessions WHERE token_hash = $1;

-- name: DeleteUserSessions :exec
DELETE FROM sessions WHERE user_id = $1;
