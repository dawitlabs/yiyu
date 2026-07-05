-- +goose Up
ALTER TABLE reports ADD COLUMN action_taken VARCHAR(30);
ALTER TABLE reports ADD COLUMN resolved_by UUID REFERENCES users(id);

-- +goose Down
ALTER TABLE reports DROP COLUMN IF EXISTS resolved_by;
ALTER TABLE reports DROP COLUMN IF EXISTS action_taken;
