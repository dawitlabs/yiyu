-- +goose Up
-- Modeled on watch_history (user-scoped, not channel-scoped like playlists —
-- playlists require a name/is_public/manual position, which Watch Later
-- doesn't need; it's a single implicit unordered per-user list).
CREATE TABLE watch_later (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, video_id)
);

-- +goose Down
DROP TABLE watch_later;
