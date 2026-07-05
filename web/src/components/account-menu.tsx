"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import type { User } from "@/lib/auth";
import type { Channel } from "@/lib/channels";
import { useClickOutside } from "@/lib/use-click-outside";

export function AccountMenu({
  user,
  channel,
}: {
  user: User;
  channel: Channel | null;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setIsOpen(false));

  async function handleLogout() {
    setIsLoggingOut(true);
    await fetch("/api/logout", { method: "POST" });
    setIsLoggingOut(false);
    setIsOpen(false);
    router.refresh();
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Account menu"
        className="block rounded-full"
      >
        <Avatar src={channel?.avatar_url ?? ""} name={user.username} />
      </button>

      {isOpen && (
        <div className="glass absolute right-0 z-50 mt-2 w-56 animate-scale-in rounded-lg py-1 text-sm shadow-modal">
          <p className="truncate px-4 py-2 text-black/60 dark:text-white/60">
            {user.username}
          </p>
          <Link
            href={channel ? `/channel/${channel.handle}` : "/channel/new"}
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10"
          >
            {channel ? channel.name : "Create channel"}
          </Link>
          {channel && (
            <>
              <Link
                href="/upload"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10"
              >
                Upload
              </Link>
              <Link
                href="/analytics"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10"
              >
                Analytics
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="block w-full px-4 py-2 text-left hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
