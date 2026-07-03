"use client";

import { type SubmitEvent, useState } from "react";
import { ReportButton } from "@/components/report-button";
import type { Comment } from "@/lib/comments";

function CommentRow({
  comment,
  currentUserId,
  currentUserRole,
  onDelete,
}: {
  comment: Comment;
  currentUserId: string | null;
  currentUserRole: "user" | "admin" | "moderator" | null;
  onDelete: (id: string) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [likesCount, setLikesCount] = useState(comment.likes_count);
  const [liked, setLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const canDelete =
    comment.author.id === currentUserId || currentUserRole === "admin";

  async function handleDelete() {
    setIsDeleting(true);
    const res = await fetch(`/api/comments/${comment.id}`, {
      method: "DELETE",
    });
    setIsDeleting(false);
    if (!res.ok) {
      return;
    }
    onDelete(comment.id);
  }

  async function handleLike() {
    setIsLiking(true);
    const res = await fetch(`/api/comments/${comment.id}/like`, {
      method: "POST",
    });
    setIsLiking(false);
    if (!res.ok) {
      return;
    }
    const { liked: nowLiked }: { liked: boolean } = await res.json();
    setLiked(nowLiked);
    setLikesCount((current) => current + (nowLiked ? 1 : -1));
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{comment.author.username}</p>
        <p className="text-sm text-black/80 dark:text-white/80">
          {comment.content}
        </p>
        {currentUserId && (
          <button
            type="button"
            disabled={isLiking}
            onClick={handleLike}
            className={`mt-1 text-xs hover:underline disabled:opacity-50 ${
              liked
                ? "text-black dark:text-white"
                : "text-black/60 dark:text-white/60"
            }`}
          >
            Like{likesCount > 0 ? ` · ${likesCount}` : ""}
          </button>
        )}
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
            disabled={isDeleting}
            onClick={handleDelete}
            className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export function CommentItem({
  videoId,
  comment,
  currentUserId,
  currentUserRole,
  onDelete,
}: {
  videoId: string;
  comment: Comment;
  currentUserId: string | null;
  currentUserRole: "user" | "admin" | "moderator" | null;
  onDelete: (id: string) => void;
}) {
  const [replies, setReplies] = useState<Comment[] | null>(null);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  async function toggleReplies() {
    if (replies !== null) {
      setReplies(null);
      return;
    }
    setIsLoadingReplies(true);
    const res = await fetch(`/api/comments/${comment.id}/replies`);
    setIsLoadingReplies(false);
    setReplies(res.ok ? await res.json() : []);
  }

  async function handleReplySubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!replyContent.trim()) {
      return;
    }
    setIsSubmittingReply(true);

    const res = await fetch(`/api/videos/${videoId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyContent, parent_id: comment.id }),
    });

    setIsSubmittingReply(false);
    if (!res.ok) {
      return;
    }

    const reply: Comment = await res.json();
    setReplies((current) => [...(current ?? []), reply]);
    setReplyContent("");
    setIsReplying(false);
  }

  function handleReplyDelete(id: string) {
    setReplies((current) => current?.filter((c) => c.id !== id) ?? null);
  }

  return (
    <div className="flex flex-col gap-3">
      <CommentRow
        comment={comment}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        onDelete={onDelete}
      />

      <div className="flex items-center gap-3 text-xs text-black/60 dark:text-white/60">
        {currentUserId && (
          <button
            type="button"
            onClick={() => setIsReplying((current) => !current)}
            className="hover:underline"
          >
            Reply
          </button>
        )}
        <button
          type="button"
          onClick={toggleReplies}
          className="hover:underline"
        >
          {isLoadingReplies
            ? "Loading…"
            : replies !== null
              ? "Hide replies"
              : "View replies"}
        </button>
      </div>

      {isReplying && (
        <form onSubmit={handleReplySubmit} className="ml-6 flex flex-col gap-2">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Add a reply…"
            rows={2}
            className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
          />
          <button
            type="submit"
            disabled={isSubmittingReply || !replyContent.trim()}
            className="self-end rounded-md bg-black px-3 py-1.5 text-xs text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {isSubmittingReply ? "Posting…" : "Reply"}
          </button>
        </form>
      )}

      {replies !== null && replies.length > 0 && (
        <div className="ml-6 flex flex-col gap-3 border-l border-black/10 pl-4 dark:border-white/10">
          {replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onDelete={handleReplyDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
