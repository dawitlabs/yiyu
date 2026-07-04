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
  expanded,
  isLoggedIn,
}: {
  expanded: boolean;
  isLoggedIn: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`shrink-0 overflow-hidden border-black/10 border-r py-2 transition-[width] duration-200 dark:border-white/10 ${
        expanded ? "w-60" : "w-20"
      }`}
    >
      {ITEMS.filter((item) => !item.requiresAuth || isLoggedIn).map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex rounded-lg hover:bg-black/5 dark:hover:bg-white/10 ${
              isActive ? "bg-black/5 dark:bg-white/10" : ""
            } ${
              expanded
                ? "mx-2 items-center gap-4 px-3 py-2.5"
                : "mx-1 flex-col items-center gap-1 px-1 py-3 text-center"
            }`}
          >
            <Icon className={expanded ? "h-5 w-5 shrink-0" : "h-6 w-6"} />
            <span className={expanded ? "text-sm" : "text-[10px]"}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </aside>
  );
}
