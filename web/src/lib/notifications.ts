export type Notification = {
  id: string;
  type: "new_subscriber" | "new_comment" | "comment_reply";
  actor_username: string | null;
  video_id: string | null;
  video_title: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
};
