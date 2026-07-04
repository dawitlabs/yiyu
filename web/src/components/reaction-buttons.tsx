"use client";

import { useState } from "react";
import { ThumbsDownIcon, ThumbsUpIcon } from "@/components/icons";

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
    <div className="flex items-center rounded-full border border-black/15 dark:border-white/15">
      <button
        type="button"
        disabled={isPending}
        onClick={() => react("like")}
        aria-label="Like"
        className={`flex items-center gap-2 rounded-l-full px-3 py-1.5 text-sm disabled:opacity-50 ${
          reaction === "like" ? "bg-black/10 dark:bg-white/15" : ""
        }`}
      >
        <ThumbsUpIcon className="h-4 w-4" />
        {likes}
      </button>
      <span className="h-5 w-px bg-black/15 dark:bg-white/15" />
      <button
        type="button"
        disabled={isPending}
        onClick={() => react("dislike")}
        aria-label="Dislike"
        className={`flex items-center gap-2 rounded-r-full px-3 py-1.5 text-sm disabled:opacity-50 ${
          reaction === "dislike" ? "bg-black/10 dark:bg-white/15" : ""
        }`}
      >
        <ThumbsDownIcon className="h-4 w-4" />
        {dislikes}
      </button>
    </div>
  );
}
