"use client";

import { useState } from "react";
import type { Playlist } from "@/lib/playlists";

export function AddToPlaylist({
  videoId,
  playlists,
}: {
  videoId: string;
  playlists: Playlist[];
}) {
  const [selectedId, setSelectedId] = useState(playlists[0]?.id ?? "");
  const [state, setState] = useState<"idle" | "pending" | "added">("idle");

  if (playlists.length === 0) {
    return null;
  }

  async function handleAdd() {
    setState("pending");
    const res = await fetch(`/api/playlists/${selectedId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_id: videoId }),
    });
    setState(res.ok ? "added" : "idle");
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="rounded-md border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/15"
      >
        {playlists.map((playlist) => (
          <option key={playlist.id} value={playlist.id}>
            {playlist.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={state === "pending"}
        onClick={handleAdd}
        className="rounded-md border border-black/15 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-white/15"
      >
        {state === "added" ? "Added" : "Add to playlist"}
      </button>
    </div>
  );
}
