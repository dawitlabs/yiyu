"use client";

import { useRouter } from "next/navigation";
import { type SubmitEvent, useState } from "react";

export function CreateVideoForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        original_url: originalUrl,
        thumbnail_url: thumbnailUrl,
      }),
    });

    if (!res.ok) {
      setIsSubmitting(false);
      setError("Something went wrong. Try again.");
      return;
    }

    const video: { id: string } = await res.json();
    router.push(`/watch/${video.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="originalUrl" className="text-sm font-medium">
          Video URL
        </label>
        <input
          id="originalUrl"
          name="originalUrl"
          type="url"
          required
          placeholder="https://cdn.example.com/my-video.mp4"
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.target.value)}
          className="rounded-md border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-transparent"
        />
        <p className="text-xs text-black/50 dark:text-white/50">
          There's no upload/transcoding pipeline yet — paste a direct link to an
          already-hosted video file.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="thumbnailUrl" className="text-sm font-medium">
          Thumbnail URL (optional)
        </label>
        <input
          id="thumbnailUrl"
          name="thumbnailUrl"
          type="url"
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
          className="rounded-md border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-transparent"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          name="title"
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
          name="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-md border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-transparent"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 rounded-md bg-black py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {isSubmitting ? "Publishing…" : "Publish"}
      </button>
    </form>
  );
}
