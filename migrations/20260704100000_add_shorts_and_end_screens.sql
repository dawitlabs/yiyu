-- +goose Up
ALTER TABLE videos ADD COLUMN is_short BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX idx_videos_is_short ON videos (is_short) WHERE is_short = true;

CREATE TABLE video_end_screens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('video', 'playlist', 'channel', 'subscribe')),
    target_id UUID NOT NULL,
    start_seconds INTEGER NOT NULL,
    position_x REAL NOT NULL DEFAULT 0.5,
    position_y REAL NOT NULL DEFAULT 0.5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_end_screens_video_id ON video_end_screens (video_id);

-- +goose Down
DROP TABLE IF EXISTS video_end_screens;
DROP INDEX IF EXISTS idx_videos_is_short;
ALTER TABLE videos DROP COLUMN IF EXISTS is_short;
