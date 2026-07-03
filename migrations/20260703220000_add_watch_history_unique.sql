-- +goose Up
ALTER TABLE watch_history ADD CONSTRAINT watch_history_user_video_key UNIQUE (user_id, video_id);

-- +goose Down
ALTER TABLE watch_history DROP CONSTRAINT IF EXISTS watch_history_user_video_key;
