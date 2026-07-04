import Link from "next/link";
import { notFound } from "next/navigation";
import { LivePlayer } from "@/components/live-player";
import { serverFetch } from "@/lib/api";
import type { Channel } from "@/lib/channels";
import type { LiveStatus } from "@/lib/live";

export default async function LiveWatchPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  const [channelRes, liveRes] = await Promise.all([
    serverFetch(`/channels/${handle}`),
    serverFetch(`/channels/${handle}/live`),
  ]);

  if (!channelRes.ok) {
    notFound();
  }

  const channel: Channel = await channelRes.json();
  const live: LiveStatus = liveRes.ok
    ? await liveRes.json()
    : { is_live: false, title: "" };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {live.is_live && live.hls_url ? (
        <>
          <LivePlayer hlsUrl={`/api${live.hls_url}`} />
          <h1 className="mt-4 text-xl font-semibold tracking-tight">
            {live.title || `${channel.name} is live`}
          </h1>
        </>
      ) : (
        <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-lg bg-black/5 text-center dark:bg-white/5">
          <p className="text-lg font-medium">{channel.name} isn't live</p>
          <p className="text-sm text-black/60 dark:text-white/60">
            Check back later, or watch their latest uploads instead.
          </p>
        </div>
      )}
      <Link
        href={`/channel/${channel.handle}`}
        className="mt-4 inline-block text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
      >
        @{channel.handle}
      </Link>
    </div>
  );
}
