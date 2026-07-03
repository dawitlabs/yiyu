export type Video = {
  id: string;
  channel_id: string;
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
  uploaded_at: string;
};
