"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminVideo } from "@/lib/videos";

export function VideosTable({ videos }: { videos: AdminVideo[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) {
      return;
    }

    setPendingId(id);
    setError(null);

    const res = await fetch(`/api/admin/videos/${id}`, { method: "DELETE" });

    setPendingId(null);
    if (!res.ok) {
      setError("Failed to delete video.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-black/60 dark:border-white/10 dark:text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Visibility</th>
              <th className="px-4 py-3 font-medium">Views</th>
              <th className="px-4 py-3 font-medium">Uploaded</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr
                key={video.id}
                className="border-b border-black/5 last:border-0 dark:border-white/5"
              >
                <td className="px-4 py-3">{video.title}</td>
                <td className="px-4 py-3">{video.status}</td>
                <td className="px-4 py-3">{video.visibility}</td>
                <td className="px-4 py-3 text-black/60 dark:text-white/60">
                  {video.views_count}
                </td>
                <td className="px-4 py-3 text-black/60 dark:text-white/60">
                  {new Date(video.uploaded_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={pendingId === video.id}
                    onClick={() => handleDelete(video.id, video.title)}
                    className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
