"use client";

import { useRouter } from "next/navigation";
import { type SubmitEvent, useRef, useState } from "react";
import type { Video } from "@/lib/videos";

type ThumbState = "idle" | "uploading";

export function EditVideoForm({ video }: { video: Video }) {
  const router = useRouter();
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description);
  const [thumbnailUrl, setThumbnailUrl] = useState(video.thumbnail_url);
  const [category, setCategory] = useState(video.category);
  const [visibility, setVisibility] = useState(video.visibility);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbState, setThumbState] = useState<ThumbState>("idle");
  const thumbRef = useRef<HTMLInputElement>(null);

  async function handleThumbnailPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbState("uploading");

    const res = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, folder: "thumbnails" }),
    });
    if (!res.ok) {
      setThumbState("idle");
      setError("Thumbnail upload failed.");
      return;
    }
    const {
      upload_url,
      public_url,
    }: { upload_url: string; public_url: string } = await res.json();

    const put = await fetch(upload_url, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    setThumbState("idle");
    if (put.ok) {
      setThumbnailUrl(public_url);
    } else {
      setError("Thumbnail upload failed.");
    }
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch(`/api/videos/${video.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        thumbnail_url: thumbnailUrl,
        category,
        visibility,
      }),
    });

    if (!res.ok) {
      setIsSubmitting(false);
      setError("Something went wrong. Try again.");
      return;
    }

    router.push(`/watch/${video.id}`);
    router.refresh();
  }

  const isBusy = isSubmitting || thumbState === "uploading";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-md border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-transparent"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-md border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-transparent"
        />
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium">Thumbnail</span>
        <div className="flex items-center gap-3">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt="Video thumbnail"
              className="h-16 w-28 rounded-md border border-black/10 object-cover dark:border-white/10"
            />
          ) : (
            <div className="flex h-16 w-28 items-center justify-center rounded-md border border-dashed border-black/20 text-xs text-black/40 dark:border-white/20 dark:text-white/40">
              None
            </div>
          )}
          <input
            ref={thumbRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleThumbnailPick}
          />
          <button
            type="button"
            disabled={thumbState === "uploading"}
            onClick={() => thumbRef.current?.click()}
            className="rounded-md border border-black/15 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-white/15"
          >
            {thumbState === "uploading" ? "Uploading…" : "Upload thumbnail"}
          </button>
          {thumbnailUrl && (
            <button
              type="button"
              onClick={() => setThumbnailUrl("")}
              className="text-sm text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category" className="text-sm font-medium">
          Category
        </label>
        <input
          id="category"
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-transparent"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="visibility" className="text-sm font-medium">
          Visibility
        </label>
        <select
          id="visibility"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          className="rounded-md border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-transparent"
        >
          <option value="public">Public</option>
          <option value="unlisted">Unlisted</option>
          <option value="private">Private</option>
        </select>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isBusy}
        className="mt-2 rounded-md bg-black py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {isSubmitting ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
