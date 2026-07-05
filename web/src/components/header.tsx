"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountMenu } from "@/components/account-menu";
import { BellIcon, MenuIcon } from "@/components/icons";
import { SearchBox } from "@/components/search-box";
import type { User } from "@/lib/auth";
import type { Channel } from "@/lib/channels";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shorts", label: "Shorts" },
  { href: "/trending", label: "Trending" },
  { href: "/channels", label: "Channels" },
];

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
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        isScrolled
          ? "bg-background/95 shadow-[0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md"
          : "bg-gradient-to-b from-black/70 to-transparent"
      }`}
    >
      <nav className="flex h-16 items-center gap-4 px-4 sm:px-6">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle menu"
          className="rounded-full p-2 transition-colors hover:bg-white/10"
        >
          <MenuIcon />
        </button>
        <Link
          href="/"
          className="font-bold text-2xl text-accent tracking-tight transition-transform duration-300 hover:scale-105"
        >
          yiyu
        </Link>

        <div className="hidden items-center gap-5 pl-4 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors duration-200 ${
                pathname === link.href
                  ? "font-semibold text-foreground"
                  : "text-secondary hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex min-w-0 flex-1 justify-end lg:flex-none">
          <SearchBox />
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="relative rounded-full p-2 transition-colors hover:bg-white/10"
            >
              <BellIcon />
              {unreadNotifications > 0 && (
                <span className="-top-0.5 -right-0.5 absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-semibold text-[10px] text-white">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </Link>
            <AccountMenu user={user} channel={channel} />
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-3 text-sm">
            <Link
              href="/login"
              className="text-secondary transition-colors hover:text-foreground"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded bg-accent px-4 py-1.5 font-semibold text-white transition-colors duration-200 hover:bg-accent-muted"
            >
              Sign up
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
