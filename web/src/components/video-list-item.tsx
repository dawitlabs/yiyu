import Link from "next/link";
import { formatRelativeTime, formatTimestamp } from "@/lib/format";
import type { Video } from "@/lib/videos";

export function VideoListItem({ video }: { video: Video }) {
  return (
    <Link href={`/watch/${video.id}`} className="flex gap-2">
      <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-black/5 dark:bg-white/10">
        {video.thumbnail_url && (
          // biome-ignore lint/performance/noImgElement: thumbnail_url is an arbitrary external host, next/image's remotePatterns can't allowlist unknown hosts
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="h-full w-full object-cover"
          />
        )}
        {video.duration > 0 && (
          <span className="absolute right-1 bottom-1 rounded bg-black/80 px-1 py-0.5 text-[10px] text-white">
            {formatTimestamp(video.duration)}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-medium">{video.title}</p>
        <p className="mt-1 text-black/60 text-xs dark:text-white/60">
          {video.channel_name}
        </p>
        <p className="text-black/60 text-xs dark:text-white/60">
          {video.views_count} views · {formatRelativeTime(video.uploaded_at)}
        </p>
      </div>
    </Link>
  );
}
