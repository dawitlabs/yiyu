export type LiveStatus = {
  is_live: boolean;
  title: string;
  hls_url?: string;
};

export type StreamCredentials = {
  rtmp_server: string;
  stream_key: string;
  whip_url: string;
};
