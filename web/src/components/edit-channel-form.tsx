"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, type SubmitEvent, useRef, useState } from "react";
import type { Channel } from "@/lib/channels";

type UploadState = "idle" | "uploading";

async function uploadFile(file: File, folder: string): Promise<string | null> {
  const res = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, folder }),
  });
  if (!res.ok) return null;

  const { upload_url, public_url }: { upload_url: string; public_url: string } =
    await res.json();

  const put = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  return put.ok ? public_url : null;
}

export function EditChannelForm({ channel }: { channel: Channel }) {
  const router = useRouter();
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description);
  const [avatarUrl, setAvatarUrl] = useState(channel.avatar_url);
  const [bannerUrl, setBannerUrl] = useState(channel.banner_url);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarUpload, setAvatarUpload] = useState<UploadState>("idle");
  const [bannerUpload, setBannerUpload] = useState<UploadState>("idle");
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  async function handleImagePick(
    e: ChangeEvent<HTMLInputElement>,
    folder: string,
    setUrl: (url: string) => void,
    setUploadState: (s: UploadState) => void,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadState("uploading");
    const url = await uploadFile(file, folder);
    setUploadState("idle");
    if (url) {
      setUrl(url);
    } else {
      setError("Upload failed. Try again.");
    }
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch(`/api/channels/${channel.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
      }),
    });

    if (!res.ok) {
      setIsSubmitting(false);
      setError("Something went wrong. Try again.");
      return;
    }

    router.push(`/channel/${channel.handle}`);
    router.refresh();
  }

  const isBusy =
    isSubmitting ||
    avatarUpload === "uploading" ||
    bannerUpload === "uploading";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Channel name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-md border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-transparent"
        />
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium">Avatar</span>
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Channel avatar"
              className="size-16 rounded-full border border-black/10 object-cover dark:border-white/10"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full border border-dashed border-black/20 text-xs text-black/40 dark:border-white/20 dark:text-white/40">
              None
            </div>
          )}
          <input
            ref={avatarRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) =>
              handleImagePick(e, "avatars", setAvatarUrl, setAvatarUpload)
            }
          />
          <button
            type="button"
            disabled={avatarUpload === "uploading"}
            onClick={() => avatarRef.current?.click()}
            className="rounded-md border border-black/15 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-white/15"
          >
            {avatarUpload === "uploading" ? "Uploading…" : "Upload avatar"}
          </button>
          {avatarUrl && (
            <button
              type="button"
              onClick={() => setAvatarUrl("")}
              className="text-sm text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium">Banner</span>
        <div className="flex flex-col gap-2">
          {bannerUrl ? (
            <img
              src={bannerUrl}
              alt="Channel banner"
              className="h-28 w-full rounded-md border border-black/10 object-cover dark:border-white/10"
            />
          ) : (
            <div className="flex h-28 w-full items-center justify-center rounded-md border border-dashed border-black/20 text-xs text-black/40 dark:border-white/20 dark:text-white/40">
              No banner
            </div>
          )}
          <input
            ref={bannerRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) =>
              handleImagePick(e, "banners", setBannerUrl, setBannerUpload)
            }
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={bannerUpload === "uploading"}
              onClick={() => bannerRef.current?.click()}
              className="rounded-md border border-black/15 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-white/15"
            >
              {bannerUpload === "uploading" ? "Uploading…" : "Upload banner"}
            </button>
            {bannerUrl && (
              <button
                type="button"
                onClick={() => setBannerUrl("")}
                className="text-sm text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
              >
                Remove
              </button>
            )}
          </div>
        </div>
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
