import { redirect } from "next/navigation";
import { LiveStreamManager } from "@/components/live-stream-manager";
import { serverFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { LiveStatus } from "@/lib/live";
import { getMyChannel } from "@/lib/my-channel";

export default async function ChannelLivePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const channel = await getMyChannel();
  if (!channel) {
    redirect("/channel/new");
  }

  const liveRes = await serverFetch(`/channels/${channel.handle}/live`);
  const live: LiveStatus = liveRes.ok
    ? await liveRes.json()
    : { is_live: false, title: "" };

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Go live</h1>
      <LiveStreamManager channelId={channel.id} initialTitle={live.title} />
    </div>
  );
}
