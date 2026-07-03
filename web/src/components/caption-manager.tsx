"use client";

import { useRouter } from "next/navigation";
import { type SubmitEvent, useState } from "react";
import type { Caption } from "@/lib/captions";

export function CaptionManager({
  videoId,
  initialCaptions,
}: {
  videoId: string;
  initialCaptions: Caption[];
}) {
  const router = useRouter();
  const [captions, setCaptions] = useState(initialCaptions);
  const [language, setLanguage] = useState("");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Choose a .vtt file.");
      return;
    }

    setIsUploading(true);

    const presignRes = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name }),
    });
    if (!presignRes.ok) {
      setIsUploading(false);
      setError("Could not start the upload. Try again.");
      return;
    }
    const {
      upload_url,
      public_url,
    }: { upload_url: string; public_url: string } = await presignRes.json();

    const putRes = await fetch(upload_url, {
      method: "PUT",
      headers: { "Content-Type": "text/vtt" },
      body: file,
    });
    if (!putRes.ok) {
      setIsUploading(false);
      setError("Upload failed partway through. Try again.");
      return;
    }

    const res = await fetch(`/api/videos/${videoId}/captions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, label, url: public_url }),
    });

    setIsUploading(false);
    if (!res.ok) {
      setError("Could not save the caption track.");
      return;
    }

    const caption: Caption = await res.json();
    setCaptions((current) => [...current, caption]);
    setLanguage("");
    setLabel("");
    setFile(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    setPendingDeleteId(id);
    const res = await fetch(`/api/captions/${id}`, { method: "DELETE" });
    setPendingDeleteId(null);
    if (!res.ok) {
      return;
    }
    setCaptions((current) => current.filter((c) => c.id !== id));
    router.refresh();
  }

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-md border border-black/10 p-4 dark:border-white/10">
      <h3 className="text-sm font-medium">Captions</h3>

      {captions.length > 0 && (
        <div className="flex flex-col gap-2">
          {captions.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between text-sm"
            >
              <span>
                {c.label} ({c.language})
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            required
            placeholder="Language code (en, am…)"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-40 rounded-md border border-black/15 px-2 py-1.5 text-sm dark:border-white/15 dark:bg-transparent"
          />
          <input
            type="text"
            required
            placeholder="Label (English…)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="flex-1 rounded-md border border-black/15 px-2 py-1.5 text-sm dark:border-white/15 dark:bg-transparent"
          />
        </div>
        <input
          type="file"
          accept=".vtt"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isUploading}
          className="self-start rounded-md border border-black/15 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-white/15"
        >
          {isUploading ? "Uploading…" : "Add caption track"}
        </button>
      </form>
    </div>
  );
}
