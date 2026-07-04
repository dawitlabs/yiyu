"use client";

import { useState } from "react";
import { BookmarkIcon } from "@/components/icons";

export function WatchLaterButton({
  videoId,
  initialInWatchLater,
}: {
  videoId: string;
  initialInWatchLater: boolean;
}) {
  const [inWatchLater, setInWatchLater] = useState(initialInWatchLater);
  const [isPending, setIsPending] = useState(false);

  async function toggle() {
    setIsPending(true);
    const res = await fetch(`/api/videos/${videoId}/watch-later`, {
      method: inWatchLater ? "DELETE" : "POST",
    });
    setIsPending(false);
    if (!res.ok) {
      return;
    }
    setInWatchLater(!inWatchLater);
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={toggle}
      aria-label={
        inWatchLater ? "Remove from Watch later" : "Save to Watch later"
      }
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm disabled:opacity-50 ${
        inWatchLater
          ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
          : "border-black/15 dark:border-white/15"
      }`}
    >
      <BookmarkIcon className="h-4 w-4" />
      {inWatchLater ? "Saved" : "Watch later"}
    </button>
  );
}
