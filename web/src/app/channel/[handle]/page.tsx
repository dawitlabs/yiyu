import Link from "next/link";
import { notFound } from "next/navigation";
import { SubscribeButton } from "@/components/subscribe-button";
import { VideoGrid } from "@/components/video-grid";
import { serverFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Channel } from "@/lib/channels";
import { getMyChannel } from "@/lib/my-channel";
import type { Video } from "@/lib/videos";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  const [channelRes, videosRes, myChannel, user] = await Promise.all([
    serverFetch(`/channels/${handle}`),
    serverFetch(`/channels/${handle}/videos`),
    getMyChannel(),
    getCurrentUser(),
  ]);

  if (!channelRes.ok) {
    notFound();
  }

  const channel: Channel = await channelRes.json();
  const videos: Video[] = videosRes.ok ? await videosRes.json() : [];
  const isOwner = myChannel?.handle === channel.handle;

  let isSubscribed = false;
  if (user && !isOwner) {
    const subRes = await serverFetch(`/channels/${channel.id}/subscription`);
    if (subRes.ok) {
      const sub: { subscribed: boolean } = await subRes.json();
      isSubscribed = sub.subscribed;
    }
  }

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
        {isOwner ? (
          <div className="flex items-center gap-2">
            <Link
              href="/channel/edit"
              className="rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
            >
              Edit channel
            </Link>
            <Link
              href="/upload"
              className="rounded-md bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black"
            >
              Upload video
            </Link>
          </div>
        ) : (
          user && (
            <SubscribeButton
              channelId={channel.id}
              initialSubscribed={isSubscribed}
            />
          )
        )}
      </div>

      <div className="mt-8">
        <VideoGrid videos={videos} />
      </div>
    </div>
  );
}
