import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { BellIcon, MenuIcon } from "@/components/icons";
import { SearchBox } from "@/components/search-box";
import type { User } from "@/lib/auth";
import type { Channel } from "@/lib/channels";

export function Header({
  user,
  channel,
  unreadNotifications,
  onToggleSidebar,
}: {
  user: User | null;
  channel: Channel | null;
  unreadNotifications: number;
  onToggleSidebar: () => void;
}) {
  return (
    <header className="border-black/10 border-b dark:border-white/10">
      <nav className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <MenuIcon />
          </button>
          <Link href="/" className="font-semibold tracking-tight">
            yiyu
          </Link>
        </div>

        <SearchBox />

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="relative rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <BellIcon />
              {unreadNotifications > 0 && (
                <span className="-top-0.5 -right-0.5 absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] text-white">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </Link>
            <AccountMenu user={user} channel={channel} />
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/login"
              className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-black px-3 py-1.5 text-white dark:bg-white dark:text-black"
            >
              Sign up
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
