"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SubscribeButton({
  channelId,
  initialSubscribed,
}: {
  channelId: string;
  initialSubscribed: boolean;
}) {
  const router = useRouter();
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [isPending, setIsPending] = useState(false);

  async function toggle() {
    setIsPending(true);
    const res = await fetch(`/api/channels/${channelId}/subscribe`, {
      method: subscribed ? "DELETE" : "POST",
    });
    setIsPending(false);
    if (!res.ok) {
      return;
    }
    setSubscribed(!subscribed);
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={toggle}
      className={`rounded-full px-4 py-1.5 text-sm font-medium disabled:opacity-50 ${
        subscribed
          ? "border border-black/15 dark:border-white/15"
          : "bg-black text-white dark:bg-white dark:text-black"
      }`}
    >
      {subscribed ? "Subscribed" : "Subscribe"}
    </button>
  );
}
