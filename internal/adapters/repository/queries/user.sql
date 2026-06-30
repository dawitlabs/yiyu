-- name: CreateUser :one
INSERT INTO users (username, email, password_hash, role, display_name, bio, avatar_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1 AND is_active = true;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1 AND is_active = true;

-- name: GetUserByUsername :one
SELECT * FROM users WHERE username = $1 AND is_active = true;

-- name: UpdateUser :one
UPDATE users SET display_name = $2, bio = $3, avatar_url = $4, updated_at = NOW() where id = $1 RETURNING *;
