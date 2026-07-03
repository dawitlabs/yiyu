"use client";

import { useRouter } from "next/navigation";
import { type SubmitEvent, useState } from "react";

type Stage = "idle" | "uploading" | "publishing";

export function CreateVideoForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!videoFile) {
      setError("Choose a video file.");
      return;
    }

    setStage("uploading");

    const presignRes = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: videoFile.name }),
    });
    if (!presignRes.ok) {
      setStage("idle");
      setError("Could not start the upload. Try again.");
      return;
    }
    const {
      upload_url,
      public_url,
    }: { upload_url: string; public_url: string } = await presignRes.json();

    const putRes = await fetch(upload_url, {
      method: "PUT",
      headers: { "Content-Type": videoFile.type || "application/octet-stream" },
      body: videoFile,
    });
    if (!putRes.ok) {
      setStage("idle");
      setError("Upload failed partway through. Try again.");
      return;
    }

    setStage("publishing");

    const res = await fetch("/api/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        original_url: public_url,
        thumbnail_url: thumbnailUrl,
      }),
    });

    if (!res.ok) {
      setStage("idle");
      setError("Upload succeeded but publishing failed. Try again.");
      return;
    }

    const video: { id: string } = await res.json();
    router.push(`/watch/${video.id}`);
    router.refresh();
  }

  const isBusy = stage !== "idle";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="videoFile" className="text-sm font-medium">
          Video file
        </label>
        <input
          id="videoFile"
          name="videoFile"
          type="file"
          accept="video/*"
          required
          onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
          className="rounded-md border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-transparent"
        />
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
        disabled={isBusy}
        className="mt-2 rounded-md bg-black py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {stage === "uploading"
          ? "Uploading…"
          : stage === "publishing"
            ? "Publishing…"
            : "Publish"}
      </button>
    </form>
  );
}
