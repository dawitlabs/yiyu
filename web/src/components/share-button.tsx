"use client";

import { useState } from "react";
import { ShareIcon } from "@/components/icons";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // user cancelled the share sheet — nothing to do
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex items-center gap-2 rounded-full border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
    >
      <ShareIcon className="h-4 w-4" />
      {copied ? "Copied" : "Share"}
    </button>
  );
}
