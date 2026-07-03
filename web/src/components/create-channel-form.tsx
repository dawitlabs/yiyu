"use client";

import { useRouter } from "next/navigation";
import { type SubmitEvent, useState } from "react";

export function CreateChannelForm() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle, name, description }),
    });

    if (!res.ok) {
      setIsSubmitting(false);
      setError(
        res.status === 409
          ? "That handle is taken, or you already have a channel."
          : "Something went wrong. Try again.",
      );
      return;
    }

    const channel: { handle: string } = await res.json();
    router.push(`/channel/${channel.handle}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="handle" className="text-sm font-medium">
          Handle
        </label>
        <input
          id="handle"
          name="handle"
          type="text"
          required
          pattern="[a-z0-9-]+"
          placeholder="my-channel"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          className="rounded-md border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-transparent"
        />
      </div>

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
        {isSubmitting ? "Creating…" : "Create channel"}
      </button>
    </form>
  );
}
