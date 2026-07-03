-- +goose Up

-- A side table rather than a column on videos: keeps every existing query
-- against videos (SELECT *, RETURNING *) untouched. tsvector isn't a type
-- pgx can scan, so it must never appear in a result set those queries return.
CREATE TABLE video_search (
    video_id UUID PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
    search_vector tsvector NOT NULL
);

CREATE INDEX idx_video_search_vector ON video_search USING GIN (search_vector);

-- +goose StatementBegin
CREATE FUNCTION videos_search_vector_update() RETURNS trigger AS $$
BEGIN
  INSERT INTO video_search (video_id, search_vector)
  VALUES (
    NEW.id,
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'C')
  )
  ON CONFLICT (video_id) DO UPDATE SET search_vector = EXCLUDED.search_vector;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER videos_search_vector_trigger
AFTER INSERT OR UPDATE ON videos
FOR EACH ROW EXECUTE FUNCTION videos_search_vector_update();

-- Backfill existing rows — the trigger only fires on future writes.
INSERT INTO video_search (video_id, search_vector)
SELECT
    id,
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'C')
FROM videos
ON CONFLICT (video_id) DO NOTHING;

-- +goose Down

DROP TRIGGER IF EXISTS videos_search_vector_trigger ON videos;
DROP FUNCTION IF EXISTS videos_search_vector_update();
DROP TABLE IF EXISTS video_search;
