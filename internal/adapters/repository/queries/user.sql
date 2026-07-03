-- name: CreateUser :one
INSERT INTO users (username, email, password_hash, role, display_name, bio, avatar_url)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetUserByID :one
SELECT * FROM users 
WHERE id = $1 AND is_active = true AND deleted_at IS NULL;

-- name: GetUserByEmail :one
SELECT * FROM users 
WHERE email = $1 AND is_active = true AND deleted_at IS NULL;

-- name: GetUserByUsername :one
SELECT * FROM users 
WHERE username = $1 AND is_active = true AND deleted_at IS NULL;

-- name: UpdateUser :one
UPDATE users 
SET display_name = $2, 
    bio = $3, 
    avatar_url = $4, 
    updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: DeleteUser :one
UPDATE users
SET is_active = false,
    deleted_at = NOW(),
    deleted_by = $2,
    updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- ==================== ADMIN QUERIES ====================

-- name: AdminDeleteUser :exec
UPDATE users
SET is_active = false,
    deleted_at = NOW(),
    deleted_by = $2,
    updated_at = NOW()
WHERE id = $1;

-- name: AdminGetAllUsers :many
SELECT * FROM users 
WHERE deleted_at IS NULL 
ORDER BY created_at DESC 
LIMIT $1 OFFSET $2;

-- name: GetUserRole :one
SELECT role FROM users WHERE id = $1;

-- Optional useful admin queries:
-- name: AdminUpdateUserRole :one
UPDATE users 
SET role = $2, 
    updated_at = NOW()
WHERE id = $1 
RETURNING *;

-- name: AdminGetUserWithDeleted :one
SELECT * FROM users WHERE id = $1;
