"use client";

import { type SubmitEvent, useState } from "react";

type StreamCredentials = {
  rtmp_server: string;
  stream_key: string;
};

export function LiveStreamManager({
  channelId,
  initialTitle,
}: {
  channelId: string;
  initialTitle: string;
}) {
  const [credentials, setCredentials] = useState<StreamCredentials | null>(
    null,
  );
  const [isIssuing, setIsIssuing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [titleSaved, setTitleSaved] = useState(false);

  async function handleIssueKey() {
    if (
      credentials &&
      !window.confirm(
        "This invalidates your current stream key — any running stream will disconnect. Continue?",
      )
    ) {
      return;
    }
    setIsIssuing(true);
    const res = await fetch(`/api/channels/${channelId}/live/key`, {
      method: "POST",
    });
    setIsIssuing(false);
    if (!res.ok) {
      return;
    }
    setCredentials(await res.json());
  }

  async function handleTitleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSavingTitle(true);
    setTitleSaved(false);
    const res = await fetch(`/api/channels/${channelId}/live`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setIsSavingTitle(false);
    setTitleSaved(res.ok);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-black/60 dark:text-white/60">
          Issue a stream key, then paste it into OBS (Settings → Stream →
          Custom) along with the server URL. Your channel goes live within
          seconds of OBS connecting.
        </p>
        <button
          type="button"
          disabled={isIssuing}
          onClick={handleIssueKey}
          className="self-start rounded-md bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {isIssuing
            ? "Issuing…"
            : credentials
              ? "Regenerate stream key"
              : "Generate stream key"}
        </button>

        {credentials && (
          <div className="mt-2 flex flex-col gap-2 rounded-md border border-black/15 p-3 text-sm dark:border-white/15">
            <div>
              <p className="text-xs text-black/60 dark:text-white/60">Server</p>
              <code className="break-all">{credentials.rtmp_server}</code>
            </div>
            <div>
              <p className="text-xs text-black/60 dark:text-white/60">
                Stream key
              </p>
              <code className="break-all">{credentials.stream_key}</code>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400">
              Shown once — copy it now. Regenerating replaces it.
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleTitleSubmit} className="flex flex-col gap-2">
        <label htmlFor="liveTitle" className="text-sm font-medium">
          Stream title
        </label>
        <input
          id="liveTitle"
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setTitleSaved(false);
          }}
          className="rounded-md border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-transparent"
        />
        <button
          type="submit"
          disabled={isSavingTitle}
          className="self-start rounded-md border border-black/15 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-white/15"
        >
          {isSavingTitle ? "Saving…" : titleSaved ? "Saved" : "Save title"}
        </button>
      </form>
    </div>
  );
}
