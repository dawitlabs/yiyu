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
    <div className="flex flex-col gap-2">
      <Link href={`/watch/${video.id}`}>
        <div className="aspect-video overflow-hidden rounded-lg bg-black/5 dark:bg-white/10">
          {video.thumbnail_url && (
            // biome-ignore lint/performance/noImgElement: thumbnail_url is an arbitrary external host, next/image's remotePatterns can't allowlist unknown hosts
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <p className="mt-2 text-sm font-medium">{video.title}</p>
      </Link>
      {video.channel_handle && (
        <Link
          href={`/channel/${video.channel_handle}`}
          className="text-xs text-black/60 hover:text-black hover:underline dark:text-white/60 dark:hover:text-white"
        >
          {video.channel_name}
        </Link>
      )}
      <p className="text-xs text-black/60 dark:text-white/60">
        {video.views_count} views
      </p>
    </div>
  );
}
