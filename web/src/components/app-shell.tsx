"use client";

import { useState } from "react";
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

  return (
    <>
      <Header
        user={user}
        channel={channel}
        unreadNotifications={unreadNotifications}
        onToggleSidebar={() => setExpanded((current) => !current)}
      />
      <div className="flex flex-1">
        <Sidebar expanded={expanded} isLoggedIn={user !== null} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}
