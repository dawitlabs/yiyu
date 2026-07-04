import { VideoGrid } from "@/components/video-grid";
import { serverFetch } from "@/lib/api";
import type { Video } from "@/lib/videos";

export default async function TrendingPage() {
  const res = await serverFetch("/videos/trending");
  const videos: Video[] = res.ok ? await res.json() : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Trending</h1>
      <div className="mt-6">
        <VideoGrid videos={videos} />
      </div>
    </div>
  );
}
