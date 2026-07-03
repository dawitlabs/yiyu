import { VideoGrid } from "@/components/video-grid";
import { serverFetch } from "@/lib/api";
import type { Video } from "@/lib/videos";

export default async function Home() {
  const res = await serverFetch("/videos");
  const videos: Video[] = res.ok ? await res.json() : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <VideoGrid videos={videos} />
    </div>
  );
}
