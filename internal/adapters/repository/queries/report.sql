-- name: CreateReport :one
INSERT INTO reports (reporter_id, video_id, comment_id, reason)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: AdminListReports :many
SELECT
    reports.id, reports.reporter_id, reports.video_id, reports.comment_id, reports.reason, reports.status, reports.created_at,
    u.username AS reporter_username,
    v.title AS video_title,
    c.content AS comment_content
FROM reports
JOIN users u ON u.id = reports.reporter_id
LEFT JOIN videos v ON v.id = reports.video_id
LEFT JOIN comments c ON c.id = reports.comment_id
ORDER BY reports.created_at DESC
LIMIT $1 OFFSET $2;

-- name: AdminUpdateReportStatus :one
UPDATE reports SET status = $2 WHERE id = $1 RETURNING *;
