"use client";

import { type SubmitEvent, useState } from "react";
import type { CommunityPost } from "@/lib/community-posts";

function PostRow({
  post,
  canDelete,
  currentUserId,
  onDelete,
}: {
  post: CommunityPost;
  canDelete: boolean;
  currentUserId: string | null;
  onDelete: (id: string) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [liked, setLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    setIsDeleting(false);
    if (!res.ok) {
      return;
    }
    onDelete(post.id);
  }

  async function handleLike() {
    setIsLiking(true);
    const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    setIsLiking(false);
    if (!res.ok) {
      return;
    }
    const { liked: nowLiked }: { liked: boolean } = await res.json();
    setLiked(nowLiked);
    setLikesCount((current) => current + (nowLiked ? 1 : -1));
  }

  return (
    <div className="rounded-md border border-black/10 px-4 py-3 dark:border-white/10">
      <p className="whitespace-pre-wrap text-sm text-black/80 dark:text-white/80">
        {post.content}
      </p>
      {post.image_url && (
        // biome-ignore lint/performance/noImgElement: user-supplied external URL, next/image would need a remote-pattern allowlist for it
        <img
          src={post.image_url}
          alt=""
          className="mt-2 max-h-80 rounded-md object-cover"
        />
      )}
      <div className="mt-2 flex items-center gap-3 text-xs">
        {currentUserId && (
          <button
            type="button"
            disabled={isLiking}
            onClick={handleLike}
            className={`hover:underline disabled:opacity-50 ${
              liked
                ? "text-black dark:text-white"
                : "text-black/60 dark:text-white/60"
            }`}
          >
            Like{likesCount > 0 ? ` · ${likesCount}` : ""}
          </button>
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

export function CommunityPostSection({
  channelId,
  initialPosts,
  isOwner,
  currentUserId,
}: {
  channelId: string;
  initialPosts: CommunityPost[];
  isOwner: boolean;
  currentUserId: string | null;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!content.trim()) {
      return;
    }
    setIsSubmitting(true);

    const res = await fetch(`/api/channels/${channelId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      return;
    }

    const post: CommunityPost = await res.json();
    setPosts((current) => [post, ...current]);
    setContent("");
  }

  function handleDelete(id: string) {
    setPosts((current) => current.filter((p) => p.id !== id));
  }

  if (!isOwner && posts.length === 0) {
    return null;
  }

  return (
    <div className="mt-10 flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight">Community</h2>

      {isOwner && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share an update with your subscribers…"
            rows={2}
            className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
          />
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="self-end rounded-md bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {isSubmitting ? "Posting…" : "Post"}
          </button>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {posts.map((post) => (
          <PostRow
            key={post.id}
            post={post}
            canDelete={isOwner}
            currentUserId={currentUserId}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
