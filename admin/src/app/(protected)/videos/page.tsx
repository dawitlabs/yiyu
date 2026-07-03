import { VideosTable } from "@/components/videos-table";
import { serverFetch } from "@/lib/api";
import type { AdminVideo } from "@/lib/videos";

export default async function VideosPage() {
  const res = await serverFetch("/admin/videos");
  const videos: AdminVideo[] = res.ok ? await res.json() : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Videos</h1>
      <p className="mt-1 text-black/60 dark:text-white/60">
        {videos.length} video{videos.length === 1 ? "" : "s"}
      </p>
      <div className="mt-6">
        <VideosTable videos={videos} />
      </div>
    </div>
  );
}
