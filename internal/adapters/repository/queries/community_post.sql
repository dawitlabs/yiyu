-- name: CreateCommunityPost :one
INSERT INTO community_posts (channel_id, content, image_url)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetCommunityPostByID :one
SELECT * FROM community_posts WHERE id = $1;

-- name: ListCommunityPostsByChannel :many
SELECT * FROM community_posts
WHERE channel_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: DeleteCommunityPost :exec
DELETE FROM community_posts WHERE id = $1;

-- name: GetCommunityPostLike :one
SELECT * FROM community_post_likes WHERE post_id = $1 AND user_id = $2;

-- name: CreateCommunityPostLike :exec
INSERT INTO community_post_likes (post_id, user_id) VALUES ($1, $2);

-- name: DeleteCommunityPostLike :exec
DELETE FROM community_post_likes WHERE post_id = $1 AND user_id = $2;

-- name: IncrementCommunityPostLikes :one
UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = $1 RETURNING *;

-- name: DecrementCommunityPostLikes :one
UPDATE community_posts SET likes_count = likes_count - 1 WHERE id = $1 RETURNING *;
