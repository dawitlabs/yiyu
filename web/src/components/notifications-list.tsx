"use client";

import Link from "next/link";
import { useState } from "react";
import type { Notification } from "@/lib/notifications";

function describe(n: Notification): string {
  const actor = n.actor_username ?? "Someone";
  switch (n.type) {
    case "new_subscriber":
      return `${actor} subscribed to your channel`;
    case "new_comment":
      return `${actor} commented on ${n.video_title ?? "your video"}`;
    case "comment_reply":
      return `${actor} replied to your comment on ${n.video_title ?? "a video"}`;
    default:
      return actor;
  }
}

function NotificationRow({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  const content = (
    <div
      className={`rounded-md border px-4 py-3 text-sm ${
        notification.is_read
          ? "border-black/10 dark:border-white/10"
          : "border-black/30 bg-black/[0.02] dark:border-white/30 dark:bg-white/[0.03]"
      }`}
    >
      {describe(notification)}
      <span className="ml-2 text-xs text-black/50 dark:text-white/50">
        {new Date(notification.created_at).toLocaleDateString()}
      </span>
    </div>
  );

  if (notification.video_id) {
    return (
      <Link href={`/watch/${notification.video_id}`} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="text-left">
      {content}
    </button>
  );
}

export function NotificationsList({
  initialNotifications,
}: {
  initialNotifications: Notification[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);

  async function handleClick(n: Notification) {
    if (n.is_read) {
      return;
    }
    setNotifications((current) =>
      current.map((item) =>
        item.id === n.id ? { ...item, is_read: true } : item,
      ),
    );
    await fetch(`/api/notifications/${n.id}/read`, { method: "POST" });
  }

  if (notifications.length === 0) {
    return (
      <p className="text-black/60 dark:text-white/60">No notifications yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {notifications.map((n) => (
        <NotificationRow
          key={n.id}
          notification={n}
          onClick={() => handleClick(n)}
        />
      ))}
    </div>
  );
}
