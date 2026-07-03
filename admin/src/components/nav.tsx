"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { User } from "@/lib/auth";

export function Nav({ user }: { user: User }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <span className="font-semibold tracking-tight">yiyu admin</span>

        <div className="flex items-center gap-4 text-sm">
          <span className="text-black/60 dark:text-white/60">
            {user.username}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-black/60 hover:text-black disabled:opacity-50 dark:text-white/60 dark:hover:text-white"
          >
            Log out
          </button>
        </div>
      </nav>
    </header>
  );
}
