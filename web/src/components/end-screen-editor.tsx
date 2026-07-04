"use client";

import { type SubmitEvent, useState } from "react";
import type { EndScreen } from "@/lib/videos";

export function EndScreenEditor({
  videoId,
  videoDuration,
  initialEndScreens,
}: {
  videoId: string;
  videoDuration: number;
  initialEndScreens: EndScreen[];
}) {
  const [endScreens, setEndScreens] = useState(initialEndScreens);
  const [isAdding, setIsAdding] = useState(false);
  const [type, setType] = useState<EndScreen["type"]>("video");
  const [targetId, setTargetId] = useState("");
  const [startSeconds, setStartSeconds] = useState(
    Math.max(0, videoDuration - 20),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch(`/api/videos/${videoId}/end-screens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        target_id: targetId,
        start_seconds: startSeconds,
        position_x: 0.5,
        position_y: 0.5,
      }),
    });

    setSubmitting(false);
    if (!res.ok) {
      setError("Failed to add end screen.");
      return;
    }

    const created: EndScreen = await res.json();
    setEndScreens((prev) => [...prev, created]);
    setIsAdding(false);
    setTargetId("");
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/end-screens/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEndScreens((prev) => prev.filter((s) => s.id !== id));
    }
  }

  const typeLabels: Record<EndScreen["type"], string> = {
    video: "Video",
    playlist: "Playlist",
    channel: "Channel",
    subscribe: "Subscribe",
  };

  return (
    <div className="flex flex-col gap-3">
      {endScreens.length === 0 && !isAdding && (
        <p className="text-sm text-black/50 dark:text-white/50">
          No end screens yet.
        </p>
      )}

      {endScreens.map((es) => (
        <div
          key={es.id}
          className="flex items-center justify-between rounded-md border border-black/10 p-3 text-sm dark:border-white/10"
        >
          <div>
            <span className="font-medium">{typeLabels[es.type]}</span>
            <span className="ml-2 text-black/50 dark:text-white/50">
              at {es.start_seconds}s
            </span>
            <span className="ml-2 text-xs text-black/40 dark:text-white/40">
              {es.target_id.slice(0, 8)}…
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleDelete(es.id)}
            className="text-sm text-red-600 hover:underline dark:text-red-400"
          >
            Remove
          </button>
        </div>
      ))}

      {isAdding ? (
        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EndScreen["type"])}
              className="rounded-md border border-black/15 px-2 py-1.5 text-sm dark:border-white/15 dark:bg-transparent"
            >
              <option value="video">Video</option>
              <option value="playlist">Playlist</option>
              <option value="channel">Channel</option>
              <option value="subscribe">Subscribe</option>
            </select>
            <input
              type="text"
              required
              placeholder="Target ID (video/channel UUID)"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="flex-1 rounded-md border border-black/15 px-2 py-1.5 text-sm dark:border-white/15 dark:bg-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="startSec" className="text-sm">
              Show at
            </label>
            <input
              id="startSec"
              type="number"
              min={0}
              max={videoDuration}
              value={startSeconds}
              onChange={(e) => setStartSeconds(Number(e.target.value))}
              className="w-20 rounded-md border border-black/15 px-2 py-1.5 text-sm dark:border-white/15 dark:bg-transparent"
            />
            <span className="text-sm text-black/50 dark:text-white/50">
              seconds
            </span>
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {submitting ? "Adding…" : "Add"}
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="self-start rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
        >
          Add end screen
        </button>
      )}
    </div>
  );
}
