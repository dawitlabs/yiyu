-- +goose Up
-- Liked-videos lookups filter by user_id + type; the only existing index
-- is the unique (video_id, user_id), leading with video_id, so that scan
-- doesn't help a "give me everything user X liked" query.
CREATE INDEX idx_video_interactions_user_type ON video_interactions(user_id, type);

-- +goose Down
DROP INDEX idx_video_interactions_user_type;
