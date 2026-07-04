import Link from "next/link";
import { serverFetch } from "@/lib/api";
import type { Channel } from "@/lib/channels";

export default async function ChannelsPage() {
  const res = await serverFetch("/channels");
  const channels: Channel[] = res.ok ? await res.json() : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Channels</h1>

      {channels.length === 0 ? (
        <p className="mt-6 text-black/60 dark:text-white/60">
          No channels yet.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {channels.map((channel) => (
            <Link
              key={channel.id}
              href={`/channel/${channel.handle}`}
              className="flex flex-col items-center gap-2 rounded-md border border-black/10 p-4 text-center hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.02]"
            >
              <div className="h-16 w-16 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                {channel.avatar_url && (
                  // biome-ignore lint/performance/noImgElement: avatar_url is an arbitrary external host, next/image's remotePatterns can't allowlist unknown hosts
                  <img
                    src={channel.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <p className="text-sm font-medium">{channel.name}</p>
              <p className="text-xs text-black/60 dark:text-white/60">
                {channel.subscriber_count} subscribers
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
