import Link from "next/link";
import { formatTimestamp, formatViews } from "@/lib/format";
import type { Video } from "@/lib/videos";

export function VideoGrid({ videos }: { videos: Video[] }) {
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-24 text-center">
        <p className="font-semibold text-lg">Nothing here yet</p>
        <p className="text-muted-foreground text-sm">
          Videos will show up here as soon as there are some.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {videos.map((video, i) => (
        <VideoCard key={video.id} video={video} index={i} />
      ))}
    </div>
  );
}

export function VideoRow({
  title,
  videos,
}: {
  title: string;
  videos: Video[];
}) {
  if (videos.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="mb-3 px-4 font-semibold text-xl tracking-tight sm:px-6">
        {title}
      </h2>
      <div className="hide-scrollbar -my-3 flex snap-x gap-2 overflow-x-auto scroll-pl-4 px-4 py-3 sm:scroll-pl-6 sm:px-6">
        {videos.map((video, i) => (
          <div
            key={video.id}
            className="w-[44vw] shrink-0 snap-start sm:w-[30vw] lg:w-[23vw] xl:w-[18.5vw] 2xl:w-[15.5vw]"
          >
            <VideoCard video={video} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}

function VideoCard({ video, index }: { video: Video; index: number }) {
  return (
    <Link
      href={`/watch/${video.id}`}
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
      className="group relative block animate-fade-up overflow-hidden rounded bg-surface transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:scale-105 hover:z-10 hover:scale-105 hover:shadow-card"
    >
      <div className="aspect-video w-full bg-gradient-to-br from-surface to-elevated">
        {video.thumbnail_url && (
          // biome-ignore lint/performance/noImgElement: thumbnail_url is an arbitrary external host, next/image's remotePatterns can't allowlist unknown hosts
          <img
            src={video.thumbnail_url}
            alt={video.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
          />
        )}
      </div>
      {video.duration > 0 && (
        <span className="absolute top-2 right-2 rounded bg-black/70 px-1.5 py-0.5 font-medium text-xs tabular-nums">
          {formatTimestamp(video.duration)}
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 fade-bottom px-3 pt-10 pb-2.5">
        <p className="line-clamp-2 font-semibold text-sm leading-snug">
          {video.title}
        </p>
        <p className="mt-1 max-h-0 truncate text-secondary text-xs opacity-0 transition-all duration-300 group-hover:max-h-8 group-hover:opacity-100">
          {video.channel_name} · {formatViews(video.views_count)}
        </p>
      </div>
    </Link>
  );
}
