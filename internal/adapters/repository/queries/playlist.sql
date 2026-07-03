-- name: CreatePlaylist :one
INSERT INTO playlists (channel_id, name, description, is_public)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetPlaylistByID :one
SELECT * FROM playlists WHERE id = $1;

-- name: ListPlaylistsByChannel :many
SELECT * FROM playlists
WHERE channel_id = $1 AND is_public = true
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: ListAllPlaylistsByChannel :many
-- Same as ListPlaylistsByChannel but includes private playlists — only
-- meant to be used once the caller is confirmed as the channel's owner.
SELECT * FROM playlists
WHERE channel_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: DeletePlaylist :exec
DELETE FROM playlists WHERE id = $1;

-- name: AddVideoToPlaylist :one
INSERT INTO playlist_videos (playlist_id, video_id, position)
VALUES ($1, $2, COALESCE((SELECT MAX(position) + 1 FROM playlist_videos WHERE playlist_id = $1), 0))
RETURNING *;

-- name: RemoveVideoFromPlaylist :exec
DELETE FROM playlist_videos WHERE playlist_id = $1 AND video_id = $2;

-- name: ListPlaylistVideos :many
SELECT videos.*
FROM playlist_videos
JOIN videos ON videos.id = playlist_videos.video_id
WHERE playlist_videos.playlist_id = $1
ORDER BY playlist_videos.position ASC;
