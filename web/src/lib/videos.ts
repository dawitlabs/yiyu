export type Video = {
  id: string;
  channel_id: string;
  channel_name: string;
  channel_handle: string;
  title: string;
  description: string;
  status: string;
  visibility: string;
  views_count: number;
  likes_count: number;
  dislikes_count: number;
  thumbnail_url: string;
  original_url: string;
  hls_playlist_url: string;
  category: string;
  tags: string[] | null;
  duration: number;
  is_short: boolean;
  uploaded_at: string;
};

export type EndScreen = {
  id: string;
  video_id: string;
  type: "video" | "playlist" | "channel" | "subscribe";
  target_id: string;
  start_seconds: number;
  position_x: number;
  position_y: number;
  created_at: string;
};
