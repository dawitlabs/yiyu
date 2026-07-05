-- name: CreatePasswordResetToken :one
INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetPasswordResetToken :one
SELECT * FROM password_reset_tokens
WHERE token_hash = $1
  AND expires_at > NOW()
  AND used_at IS NULL;

-- name: UsePasswordResetToken :exec
UPDATE password_reset_tokens SET used_at = NOW()
WHERE id = $1;

-- name: DeleteUserPasswordResetTokens :exec
DELETE FROM password_reset_tokens WHERE user_id = $1;
