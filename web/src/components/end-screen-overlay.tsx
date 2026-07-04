"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { EndScreen } from "@/lib/videos";

export function EndScreenOverlay({
  endScreens,
  currentTime,
  duration,
}: {
  endScreens: EndScreen[];
  currentTime: number;
  duration: number;
}) {
  const [visible, setVisible] = useState<EndScreen[]>([]);

  useEffect(() => {
    const active = endScreens.filter(
      (es) => currentTime >= es.start_seconds && currentTime <= duration,
    );
    setVisible(active);
  }, [currentTime, duration, endScreens]);

  if (visible.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      {visible.map((es) => {
        const href = endScreenHref(es);
        return (
          <Link
            key={es.id}
            href={href}
            className="pointer-events-auto absolute flex items-center gap-2 rounded-lg border border-white/20 bg-black/70 px-4 py-2 text-sm text-white backdrop-blur-sm transition-opacity hover:bg-black/80"
            style={{
              left: `${es.position_x * 100}%`,
              top: `${es.position_y * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {endScreenLabel(es)}
          </Link>
        );
      })}
    </div>
  );
}

function endScreenHref(es: EndScreen): string {
  switch (es.type) {
    case "video":
      return `/watch/${es.target_id}`;
    case "playlist":
      return `/playlist/${es.target_id}`;
    case "channel":
    case "subscribe":
      return `/channel/${es.target_id}`;
  }
}

function endScreenLabel(es: EndScreen): string {
  switch (es.type) {
    case "video":
      return "Watch next";
    case "playlist":
      return "View playlist";
    case "channel":
      return "Visit channel";
    case "subscribe":
      return "Subscribe";
  }
}
