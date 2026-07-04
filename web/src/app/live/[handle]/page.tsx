import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveChat } from "@/components/live-chat";
import { LivePlayer } from "@/components/live-player";
import { serverFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Channel } from "@/lib/channels";
import type { LiveStatus } from "@/lib/live";

export default async function LiveWatchPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  const [channelRes, liveRes, user] = await Promise.all([
    serverFetch(`/channels/${handle}`),
    serverFetch(`/channels/${handle}/live`),
    getCurrentUser(),
  ]);

  if (!channelRes.ok) {
    notFound();
  }

  const channel: Channel = await channelRes.json();
  const live: LiveStatus = liveRes.ok
    ? await liveRes.json()
    : { is_live: false, title: "" };

  return (
    <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
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

      {live.is_live &&
        (user ? (
          <LiveChat channelHandle={channel.handle} />
        ) : (
          <div className="flex h-[500px] flex-col items-center justify-center gap-2 rounded-lg border border-black/10 text-center dark:border-white/10">
            <p className="text-sm text-black/60 dark:text-white/60">
              <Link href="/login" className="underline">
                Log in
              </Link>{" "}
              to join the chat.
            </p>
          </div>
        ))}
    </div>
  );
}
