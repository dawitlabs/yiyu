"use client";

import { useRouter } from "next/navigation";
import { type SubmitEvent, useState } from "react";
import type { Chapter } from "@/lib/chapters";

export function ChapterManager({
  videoId,
  initialChapters,
}: {
  videoId: string;
  initialChapters: Chapter[];
}) {
  const router = useRouter();
  const [chapters, setChapters] = useState(
    [...initialChapters].sort((a, b) => a.start_seconds - b.start_seconds),
  );
  const [title, setTitle] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function parseTimestamp(value: string): number | null {
    const parts = value.split(":").map((p) => Number(p));
    if (parts.some((p) => Number.isNaN(p))) {
      return null;
    }
    if (parts.length === 1) {
      return parts[0];
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return null;
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const startSeconds = parseTimestamp(timestamp);
    if (startSeconds === null || startSeconds < 0) {
      setError("Enter a timestamp like 1:30 or a number of seconds.");
      return;
    }

    setIsSubmitting(true);
    const res = await fetch(`/api/videos/${videoId}/chapters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, start_seconds: startSeconds }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      setError("Could not save the chapter.");
      return;
    }

    const chapter: Chapter = await res.json();
    setChapters((current) =>
      [...current, chapter].sort((a, b) => a.start_seconds - b.start_seconds),
    );
    setTitle("");
    setTimestamp("");
    router.refresh();
  }

  async function handleDelete(id: string) {
    setPendingDeleteId(id);
    const res = await fetch(`/api/chapters/${id}`, { method: "DELETE" });
    setPendingDeleteId(null);
    if (!res.ok) {
      return;
    }
    setChapters((current) => current.filter((c) => c.id !== id));
    router.refresh();
  }

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-md border border-black/10 p-4 dark:border-white/10">
      <h3 className="text-sm font-medium">Chapters</h3>

      {chapters.length > 0 && (
        <div className="flex flex-col gap-2">
          {chapters.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between text-sm"
            >
              <span>
                {c.start_seconds}s — {c.title}
              </span>
              <button
                type="button"
                disabled={pendingDeleteId === c.id}
                onClick={() => handleDelete(c.id)}
                className="text-xs text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          required
          placeholder="1:30"
          value={timestamp}
          onChange={(e) => setTimestamp(e.target.value)}
          className="w-20 rounded-md border border-black/15 px-2 py-1.5 text-sm dark:border-white/15 dark:bg-transparent"
        />
        <input
          type="text"
          required
          placeholder="Chapter title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded-md border border-black/15 px-2 py-1.5 text-sm dark:border-white/15 dark:bg-transparent"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="shrink-0 rounded-md border border-black/15 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-white/15"
        >
          {isSubmitting ? "Adding…" : "Add"}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
