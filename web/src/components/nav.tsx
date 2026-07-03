"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { User } from "@/lib/auth";

export function Nav({ user }: { user: User | null }) {
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

        {user ? (
          <div className="flex items-center gap-4 text-sm">
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
