-- Users Table
CREATE TYPE user_role AS ENUM(
    'user',
    'admin',
    'moderator'
);
CREATE TABLE users(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
) CREATE TABLE channels(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id)
ON DELETE CASCADE,
    handleVARCHAR(50) UNIQUE NOT NULL,
    nameVARCHAR(100) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    subscriber_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE videos(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id)
ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    visiblity VARCHAR(20) NOT NULL DEFAULT 'public',
    views_count BIGINT DEFAULT 0,
    likes_count BIGINT DEFAULT 0,
    dislikes_count BIGINT DEFAULT 0,
    thumbnail_url TEXT,
    original_url TEXT,
    hls_playlist_url TEXT,
    categoryVARCHAR(100),
    tags TEXT [],
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE video_files(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id)
ON DELETE CASCADE,
    resolution VARCHAR(20) NOT NULL,
    url TEXT NOT NULL,
    file_size BIGINT,
    bitrate INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW
);
-- index for high performance
CREATE INDEX idx_videos_channel_id
ON videos(channel_id);
CREATE INDEX idx_videos_status
ON videos(status);
CREATE INDEX idx_videos_published_at
ON videos(published_at);
CREATE INDEX idx_channels_user_id
ON channels(user_id);
