export type AdminReport = {
  id: string;
  reporter_username: string;
  video_id: string | null;
  video_title: string | null;
  comment_id: string | null;
  comment_content: string | null;
  reason: string;
  status: "pending" | "reviewed" | "dismissed";
  created_at: string;
};
