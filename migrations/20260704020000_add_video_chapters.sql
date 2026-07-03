-- +goose Up
CREATE TABLE video_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    start_seconds INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_video_chapters_video_id ON video_chapters(video_id);

-- +goose Down
DROP TABLE video_chapters;
