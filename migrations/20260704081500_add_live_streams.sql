-- +goose Up
CREATE TABLE live_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID UNIQUE REFERENCES channels(id) ON DELETE CASCADE,
    stream_key TEXT UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (status IN ('offline', 'live')),
    started_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_live_streams_status ON live_streams(status);

-- +goose Down
DROP TABLE live_streams;
