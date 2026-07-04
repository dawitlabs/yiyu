-- +goose Up
-- Autocomplete needs fast, case-insensitive prefix matching — a separate,
-- simpler path from the full-text search index (video_search/tsvector),
-- which isn't shaped for prefix-as-you-type suggestions. text_pattern_ops
-- makes a btree index usable for prefix LIKE regardless of locale; indexing
-- lower(title) (rather than plain "title") is what lets a case-insensitive
-- "lower(title) LIKE lower($1) || '%'" query actually use the index.
CREATE INDEX idx_videos_title_prefix ON videos (lower(title) text_pattern_ops);

-- +goose Down
DROP INDEX idx_videos_title_prefix;
