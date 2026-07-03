"use client";

import { useState } from "react";

type ReactionType = "like" | "dislike" | null;

export function ReactionButtons({
  videoId,
  initialLikes,
  initialDislikes,
  initialReaction,
  canReact,
}: {
  videoId: string;
  initialLikes: number;
  initialDislikes: number;
  initialReaction: ReactionType;
  canReact: boolean;
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [reaction, setReaction] = useState<ReactionType>(initialReaction);
  const [isPending, setIsPending] = useState(false);

  async function react(type: "like" | "dislike") {
    if (!canReact || isPending) {
      return;
    }
    setIsPending(true);

    const res = await fetch(`/api/videos/${videoId}/${type}`, {
      method: "POST",
    });

    setIsPending(false);
    if (!res.ok) {
      return;
    }

    const video: { likes_count: number; dislikes_count: number } =
      await res.json();
    setLikes(video.likes_count);
    setDislikes(video.dislikes_count);
    setReaction((current) => (current === type ? null : type));
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => react("like")}
        className={`rounded-full border px-3 py-1.5 text-sm disabled:opacity-50 ${
          reaction === "like"
            ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
            : "border-black/15 dark:border-white/15"
        }`}
      >
        Like · {likes}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => react("dislike")}
        className={`rounded-full border px-3 py-1.5 text-sm disabled:opacity-50 ${
          reaction === "dislike"
            ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
            : "border-black/15 dark:border-white/15"
        }`}
      >
        Dislike · {dislikes}
      </button>
    </div>
  );
}
