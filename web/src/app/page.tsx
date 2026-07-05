import Link from "next/link";
import { InfoIcon, PlayIcon } from "@/components/icons";
import { VideoGrid, VideoRow } from "@/components/video-grid";
import { serverFetch } from "@/lib/api";
import { formatViews } from "@/lib/format";
import type { Video } from "@/lib/videos";

export const dynamic = "force-dynamic";

export default async function Home() {
  const res = await serverFetch("/videos");
  const videos: Video[] = res.ok ? await res.json() : [];

  if (videos.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <VideoGrid videos={videos} />
      </div>
    );
  }

  const byViews = [...videos].sort((a, b) => b.views_count - a.views_count);
  const featured = byViews[0];

  const byCategory = new Map<string, Video[]>();
  for (const video of videos) {
    if (!video.category) continue;
    const group = byCategory.get(video.category) ?? [];
    group.push(video);
    byCategory.set(video.category, group);
  }
  const categoryRows = [...byCategory.entries()].filter(
    ([, group]) => group.length >= 2,
  );

  return (
    <div className="pb-16">
      <Billboard video={featured} />
      <div className="relative z-10 -mt-24 space-y-8">
        <VideoRow title="New on yiyu" videos={videos} />
        {byViews.length >= 4 && (
          <VideoRow title="Most watched" videos={byViews} />
        )}
        {categoryRows.map(([category, group]) => (
          <VideoRow key={category} title={category} videos={group} />
        ))}
      </div>
    </div>
  );
}

function Billboard({ video }: { video: Video }) {
  return (
    <section className="-mt-16 relative flex min-h-[440px] items-end sm:h-[76vh]">
      <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-surface to-background">
        {video.thumbnail_url && (
          // biome-ignore lint/performance/noImgElement: thumbnail_url is an arbitrary external host, next/image's remotePatterns can't allowlist unknown hosts
          <img
            src={video.thumbnail_url}
            alt=""
            className="h-full w-full animate-fade-in object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 fade-bottom" />
      </div>

      <div className="relative max-w-2xl px-4 pt-36 pb-28 sm:px-6">
        <div className="animate-fade-up space-y-4">
          <p className="flex items-center gap-2 font-semibold text-secondary text-xs uppercase tracking-[0.2em]">
            <span className="h-4 w-1 rounded-full bg-accent" />
            Featured
          </p>
          <h1 className="font-bold text-4xl leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            {video.title}
          </h1>
          {video.description && (
            <p className="line-clamp-2 hidden max-w-xl text-base text-secondary sm:block">
              {video.description}
            </p>
          )}
          <p className="text-muted-foreground text-sm">
            {video.channel_name} · {formatViews(video.views_count)}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={`/watch/${video.id}`}
              className="flex items-center gap-2 rounded bg-white px-6 py-3 font-bold text-background transition-[background-color,transform] duration-200 hover:scale-[1.03] hover:bg-white/85"
            >
              <PlayIcon className="h-5 w-5" />
              Play
            </Link>
            <Link
              href={`/channel/${video.channel_handle}`}
              className="flex items-center gap-2 rounded bg-[rgba(109,109,110,0.7)] px-6 py-3 font-semibold text-white transition-[background-color,transform] duration-200 hover:scale-[1.03] hover:bg-[rgba(109,109,110,0.5)]"
            >
              <InfoIcon className="h-5 w-5" />
              {video.channel_name}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
