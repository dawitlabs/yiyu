"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import type { User } from "@/lib/auth";
import type { Channel } from "@/lib/channels";

export function AppShell({
  user,
  channel,
  unreadNotifications,
  children,
}: {
  user: User | null;
  channel: Channel | null;
  unreadNotifications: number;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <>
      <Header
        user={user}
        channel={channel}
        unreadNotifications={unreadNotifications}
        onToggleSidebar={() => setDrawerOpen((v) => !v)}
      />
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 animate-fade-in bg-black/60"
          onClick={() => setDrawerOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setDrawerOpen(false)}
        />
      )}
      <Sidebar open={drawerOpen} isLoggedIn={user !== null} />
      <main className="min-w-0 flex-1 pt-16">{children}</main>
    </>
  );
}
