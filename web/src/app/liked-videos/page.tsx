import { redirect } from "next/navigation";
import { VideoGrid } from "@/components/video-grid";
import { serverFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Video } from "@/lib/videos";

export default async function LikedVideosPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const res = await serverFetch("/me/liked-videos");
  const videos: Video[] = res.ok ? await res.json() : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Liked videos</h1>
      <div className="mt-6">
        <VideoGrid videos={videos} />
      </div>
    </div>
  );
}
