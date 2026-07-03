import Link from "next/link";
import type { Video } from "@/lib/videos";

export function VideoGrid({ videos }: { videos: Video[] }) {
  if (videos.length === 0) {
    return <p className="text-black/60 dark:text-white/60">No videos yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}

function VideoCard({ video }: { video: Video }) {
  return (
    <Link href={`/watch/${video.id}`} className="flex flex-col gap-2">
      <div className="aspect-video overflow-hidden rounded-md bg-black/5 dark:bg-white/10">
        {video.thumbnail_url && (
          // biome-ignore lint/performance/noImgElement: thumbnail_url is an arbitrary external host, next/image's remotePatterns can't allowlist unknown hosts
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <p className="text-sm font-medium">{video.title}</p>
      <p className="text-xs text-black/60 dark:text-white/60">
        {video.views_count} views
      </p>
    </Link>
  );
}
