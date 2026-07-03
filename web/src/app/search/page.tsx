import { VideoGrid } from "@/components/video-grid";
import { serverFetch } from "@/lib/api";
import type { Video } from "@/lib/videos";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const videos: Video[] = query
    ? await serverFetch(`/search?q=${encodeURIComponent(query)}`).then((res) =>
        res.ok ? res.json() : [],
      )
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        {query ? `Results for "${query}"` : "Search"}
      </h1>
      <div className="mt-6">
        {query ? (
          <VideoGrid videos={videos} />
        ) : (
          <p className="text-black/60 dark:text-white/60">
            Type something in the search box above.
          </p>
        )}
      </div>
    </div>
  );
}
