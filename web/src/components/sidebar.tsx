"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookmarkIcon,
  ChannelsIcon,
  HistoryIcon,
  HomeIcon,
  ShortsIcon,
  SubscriptionsIcon,
  ThumbsUpIcon,
  TrendingIcon,
} from "@/components/icons";

const ITEMS = [
  { href: "/", label: "Home", icon: HomeIcon, requiresAuth: false },
  {
    href: "/shorts",
    label: "Shorts",
    icon: ShortsIcon,
    requiresAuth: false,
  },
  {
    href: "/trending",
    label: "Trending",
    icon: TrendingIcon,
    requiresAuth: false,
  },
  {
    href: "/channels",
    label: "Channels",
    icon: ChannelsIcon,
    requiresAuth: false,
  },
  {
    href: "/subscriptions",
    label: "Subscriptions",
    icon: SubscriptionsIcon,
    requiresAuth: true,
  },
  { href: "/history", label: "History", icon: HistoryIcon, requiresAuth: true },
  {
    href: "/liked-videos",
    label: "Liked videos",
    icon: ThumbsUpIcon,
    requiresAuth: true,
  },
  {
    href: "/watch-later",
    label: "Watch later",
    icon: BookmarkIcon,
    requiresAuth: true,
  },
];

export function Sidebar({
  open,
  isLoggedIn,
}: {
  open: boolean;
  isLoggedIn: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside
      aria-hidden={!open}
      className={`glass fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto px-3 pt-20 pb-6 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {ITEMS.filter((item) => !item.requiresAuth || isLoggedIn).map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            tabIndex={open ? 0 : -1}
            className={`relative flex items-center gap-4 rounded px-4 py-3 transition-colors duration-200 ${
              isActive
                ? "bg-white/10 font-semibold text-foreground"
                : "text-secondary hover:bg-white/5 hover:text-foreground"
            }`}
          >
            {isActive && (
              <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" />
            )}
            <Icon className="h-5 w-5 shrink-0" />
            <span className="text-sm">{item.label}</span>
          </Link>
        );
      })}
    </aside>
  );
}
