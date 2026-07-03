import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoGrid } from "@/components/video-grid";
import { serverFetch } from "@/lib/api";
import type { Channel } from "@/lib/channels";
import { getMyChannel } from "@/lib/my-channel";
import type { Video } from "@/lib/videos";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  const [channelRes, videosRes, myChannel] = await Promise.all([
    serverFetch(`/channels/${handle}`),
    serverFetch(`/channels/${handle}/videos`),
    getMyChannel(),
  ]);

  if (!channelRes.ok) {
    notFound();
  }

  const channel: Channel = await channelRes.json();
  const videos: Video[] = videosRes.ok ? await videosRes.json() : [];
  const isOwner = myChannel?.handle === channel.handle;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {channel.name}
          </h1>
          <p className="text-black/60 dark:text-white/60">
            @{channel.handle} · {channel.subscriber_count} subscribers
          </p>
          {channel.description && (
            <p className="mt-2 max-w-xl text-black/80 dark:text-white/80">
              {channel.description}
            </p>
          )}
        </div>
        {isOwner && (
          <Link
            href="/upload"
            className="rounded-md bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black"
          >
            Upload video
          </Link>
        )}
      </div>

      <div className="mt-8">
        <VideoGrid videos={videos} />
      </div>
    </div>
  );
}
