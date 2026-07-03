"use client";

import { type SubmitEvent, useState } from "react";
import { ReportButton } from "@/components/report-button";
import type { Comment } from "@/lib/comments";

export function CommentSection({
  videoId,
  initialComments,
  currentUserId,
  currentUserRole,
}: {
  videoId: string;
  initialComments: Comment[];
  currentUserId: string | null;
  currentUserRole: "user" | "admin" | "moderator" | null;
}) {
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!content.trim()) {
      return;
    }
    setIsSubmitting(true);

    const res = await fetch(`/api/videos/${videoId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      return;
    }

    const comment: Comment = await res.json();
    setComments((current) => [comment, ...current]);
    setContent("");
  }

  async function handleDelete(id: string) {
    setPendingDeleteId(id);
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    setPendingDeleteId(null);
    if (!res.ok) {
      return;
    }
    setComments((current) => current.filter((c) => c.id !== id));
  }

  return (
    <div className="mt-8 flex flex-col gap-4">
      <h2 className="text-sm font-medium">{comments.length} comments</h2>

      {currentUserId ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment…"
            rows={2}
            className="rounded-md border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-transparent"
          />
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="self-end rounded-md bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {isSubmitting ? "Posting…" : "Comment"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-black/60 dark:text-white/60">
          Log in to comment.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {comments.map((comment) => {
          const canDelete =
            comment.author.id === currentUserId || currentUserRole === "admin";

          return (
            <div
              key={comment.id}
              className="flex items-start justify-between gap-4"
            >
              <div>
                <p className="text-sm font-medium">{comment.author.username}</p>
                <p className="text-sm text-black/80 dark:text-white/80">
                  {comment.content}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs">
                {currentUserId && currentUserId !== comment.author.id && (
                  <ReportButton
                    targetType="comments"
                    targetId={comment.id}
                    className="text-black/60 hover:underline disabled:opacity-50 dark:text-white/60"
                  />
                )}
                {canDelete && (
                  <button
                    type="button"
                    disabled={pendingDeleteId === comment.id}
                    onClick={() => handleDelete(comment.id)}
                    className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
