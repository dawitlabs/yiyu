"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Video } from "@/lib/videos";

export function PlaylistVideos({
  playlistId,
  initialVideos,
  isOwner,
}: {
  playlistId: string;
  initialVideos: Video[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [videos, setVideos] = useState(initialVideos);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleRemove(videoId: string) {
    setPendingId(videoId);
    const res = await fetch(`/api/playlists/${playlistId}/videos/${videoId}`, {
      method: "DELETE",
    });
    setPendingId(null);
    if (!res.ok) {
      return;
    }
    setVideos((current) => current.filter((v) => v.id !== videoId));
    router.refresh();
  }

  if (videos.length === 0) {
    return <p className="text-black/60 dark:text-white/60">No videos yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {videos.map((video) => (
        <div
          key={video.id}
          className="flex items-center justify-between gap-4 rounded-md border border-black/10 px-4 py-3 dark:border-white/10"
        >
          <Link href={`/watch/${video.id}`} className="flex-1">
            <p className="text-sm font-medium">{video.title}</p>
            <p className="text-xs text-black/60 dark:text-white/60">
              {video.views_count} views
            </p>
          </Link>
          {isOwner && (
            <button
              type="button"
              disabled={pendingId === video.id}
              onClick={() => handleRemove(video.id)}
              className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
            >
              Remove
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
