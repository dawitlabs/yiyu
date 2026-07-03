"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeletePlaylistButton({ playlistId }: { playlistId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this playlist? This cannot be undone.")) {
      return;
    }
    setIsPending(true);
    const res = await fetch(`/api/playlists/${playlistId}`, {
      method: "DELETE",
    });
    setIsPending(false);
    if (!res.ok) {
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleDelete}
      className="rounded-md border border-red-600 px-3 py-1.5 text-sm text-red-600 disabled:opacity-50 dark:border-red-400 dark:text-red-400"
    >
      Delete playlist
    </button>
  );
}
