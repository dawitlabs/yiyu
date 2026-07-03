"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { User } from "@/lib/auth";
import type { Channel } from "@/lib/channels";

export function Nav({
  user,
  channel,
  unreadNotifications,
}: {
  user: User | null;
  channel: Channel | null;
  unreadNotifications: number;
}) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await fetch("/api/logout", { method: "POST" });
    setIsLoggingOut(false);
    router.refresh();
  }

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          yiyu
        </Link>

        <form action="/search" method="get" className="mx-4 flex-1 max-w-md">
          <input
            type="search"
            name="q"
            placeholder="Search"
            aria-label="Search videos"
            className="w-full rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/15 dark:bg-transparent"
          />
        </form>

        {user ? (
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/subscriptions"
              className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
            >
              Subscriptions
            </Link>
            <Link
              href="/history"
              className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
            >
              History
            </Link>
            <Link
              href="/notifications"
              className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
            >
              Notifications
              {unreadNotifications > 0 ? ` (${unreadNotifications})` : ""}
            </Link>
            <Link
              href={channel ? `/channel/${channel.handle}` : "/channel/new"}
              className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
            >
              {channel ? channel.name : "Create channel"}
            </Link>
            {channel && (
              <Link
                href="/upload"
                className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
              >
                Upload
              </Link>
            )}
            <span className="text-black/60 dark:text-white/60">
              {user.username}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white disabled:opacity-50"
            >
              Log out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/login"
              className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-black px-3 py-1.5 text-white dark:bg-white dark:text-black"
            >
              Sign up
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
