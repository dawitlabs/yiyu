export type VideoStat = {
  id: string;
  title: string;
  views_count: number;
  likes_count: number;
  dislikes_count: number;
  uploaded_at: string;
};

export type ChannelAnalytics = {
  total_views: number;
  total_likes: number;
  total_dislikes: number;
  total_videos: number;
  subscriber_count: number;
  new_subscribers_7d: number;
  new_subscribers_30d: number;
  videos: VideoStat[];
};
