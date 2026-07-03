-- +goose Up
ALTER TABLE channels ADD CONSTRAINT channels_user_id_key UNIQUE (user_id);

-- +goose Down
ALTER TABLE channels DROP CONSTRAINT IF EXISTS channels_user_id_key;
