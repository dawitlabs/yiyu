-- name: UpsertLiveStreamKey :one
-- Issuing a key is also how a channel "resets" their stream — regenerating
-- forces status back to offline until the new key is actually used to publish.
INSERT INTO live_streams (channel_id, stream_key)
VALUES ($1, $2)
ON CONFLICT (channel_id) DO UPDATE
SET stream_key = $2, status = 'offline', started_at = NULL, updated_at = NOW()
RETURNING *;

-- name: GetLiveStreamByChannelID :one
SELECT * FROM live_streams WHERE channel_id = $1;

-- name: UpdateLiveStreamTitle :one
UPDATE live_streams SET title = $2, updated_at = NOW() WHERE channel_id = $1 RETURNING *;

-- name: ListLiveStreams :many
-- Small table (one row per channel that's ever gone live) — a full scan
-- every poll interval is cheap enough that indexing by status isn't needed.
SELECT * FROM live_streams;

-- name: SetLiveStreamStatus :exec
UPDATE live_streams SET status = $2, started_at = $3, updated_at = NOW() WHERE id = $1;
