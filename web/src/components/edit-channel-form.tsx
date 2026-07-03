"use client";

import { useRouter } from "next/navigation";
import { type SubmitEvent, useState } from "react";
import type { Channel } from "@/lib/channels";

export function EditChannelForm({ channel }: { channel: Channel }) {
  const router = useRouter();
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description);
  const [avatarUrl, setAvatarUrl] = useState(channel.avatar_url);
  const [bannerUrl, setBannerUrl] = useState(channel.banner_url);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="avatarUrl" className="text-sm font-medium">
          Avatar URL
        </label>
        <input
          id="avatarUrl"
          name="avatarUrl"
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          className="rounded-md border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-transparent"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bannerUrl" className="text-sm font-medium">
          Banner URL
        </label>
        <input
          id="bannerUrl"
          name="bannerUrl"
          type="url"
          value={bannerUrl}
          onChange={(e) => setBannerUrl(e.target.value)}
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
        {isSubmitting ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
