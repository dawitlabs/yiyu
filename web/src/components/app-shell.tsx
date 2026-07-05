"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <Header
        user={user}
        channel={channel}
        unreadNotifications={unreadNotifications}
        onToggleSidebar={() => {
          if (window.innerWidth < 1024) {
            setMobileOpen((v) => !v);
          } else {
            setExpanded((v) => !v);
          }
        }}
      />
      <div className="flex flex-1">
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setMobileOpen(false)}
          />
        )}
        <Sidebar
          expanded={expanded}
          mobileOpen={mobileOpen}
          isLoggedIn={user !== null}
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}
