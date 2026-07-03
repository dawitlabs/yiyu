import { notFound } from "next/navigation";
import { ViewRecorder } from "@/components/view-recorder";
import { serverFetch } from "@/lib/api";
import type { Video } from "@/lib/videos";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const res = await serverFetch(`/videos/${id}`);
  if (!res.ok) {
    notFound();
  }

  const video: Video = await res.json();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <ViewRecorder videoId={video.id} />
      <div className="aspect-video overflow-hidden rounded-lg bg-black">
        {/* biome-ignore lint/a11y/useMediaCaption: no captions/transcripts available yet for user-provided video URLs */}
        <video src={video.original_url} controls className="h-full w-full" />
      </div>

      <h1 className="mt-4 text-xl font-semibold tracking-tight">
        {video.title}
      </h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        {video.views_count} views
      </p>
      {video.description && (
        <p className="mt-3 whitespace-pre-wrap text-black/80 dark:text-white/80">
          {video.description}
        </p>
      )}
    </div>
  );
}
