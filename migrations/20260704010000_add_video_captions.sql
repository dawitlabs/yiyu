-- +goose Up
CREATE TABLE video_captions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL,
    label VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_video_captions_video_id ON video_captions(video_id);

-- +goose Down
DROP TABLE video_captions;
