import { notFound, redirect } from "next/navigation";
import { EditVideoForm } from "@/components/edit-video-form";
import { EndScreenEditor } from "@/components/end-screen-editor";
import { serverFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getMyChannel } from "@/lib/my-channel";
import type { EndScreen, Video } from "@/lib/videos";

export default async function EditVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [user, myChannel, res] = await Promise.all([
    getCurrentUser(),
    getMyChannel(),
    serverFetch(`/videos/${id}`),
  ]);

  if (!user) redirect("/login");
  if (!res.ok) notFound();

  const video: Video = await res.json();
  if (!myChannel || myChannel.id !== video.channel_id) notFound();

  const endScreensRes = await serverFetch(`/videos/${id}/end-screens`);
  const endScreens: EndScreen[] = endScreensRes.ok
    ? await endScreensRes.json()
    : [];

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Edit video</h1>
      <EditVideoForm video={video} />

      <div className="border-t border-black/10 pt-6 dark:border-white/10">
        <h2 className="text-lg font-semibold tracking-tight">End screens</h2>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Cards that appear in the last seconds of your video, linking to other
          videos or your channel.
        </p>
        <div className="mt-4">
          <EndScreenEditor
            videoId={video.id}
            videoDuration={video.duration}
            initialEndScreens={endScreens}
          />
        </div>
      </div>
    </div>
  );
}
