import type { Video } from "@/lib/videos";

export type Playlist = {
  id: string;
  channel_id: string;
  name: string;
  description: string;
  is_public: boolean;
  created_at: string;
};

export type PlaylistWithVideos = Playlist & {
  videos: Video[];
};
