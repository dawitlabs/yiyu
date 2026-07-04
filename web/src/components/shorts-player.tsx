"use client";

import Hls from "hls.js";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Video } from "@/lib/videos";

export function ShortsPlayer({ shorts }: { shorts: Video[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    const height = el.clientHeight;
    const index = Math.round(scrollTop / height);
    setActiveIndex(Math.min(index, shorts.length - 1));
  }, [shorts.length]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex snap-y snap-mandatory flex-col gap-4 overflow-y-auto"
      style={{ maxHeight: "80vh" }}
    >
      {shorts.map((short, i) => (
        <ShortCard key={short.id} short={short} isActive={i === activeIndex} />
      ))}
    </div>
  );
}

function ShortCard({
  short,
  isActive,
}: { short: Video; isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const src = short.hls_playlist_url || short.original_url;

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (src.endsWith(".m3u8")) {
      if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
        videoEl.src = src;
      } else if (Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(videoEl);
        return () => {
          hlsRef.current = null;
          hls.destroy();
        };
      }
    } else {
      videoEl.src = src;
    }
  }, [src]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (isActive) {
      videoEl.play().catch(() => {});
    } else {
      videoEl.pause();
      videoEl.currentTime = 0;
    }
  }, [isActive]);

  return (
    <div className="flex snap-start flex-col gap-2">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-black">
        {/* biome-ignore lint/a11y/useMediaCaption: shorts are short-form video with no caption tracks */}
        <video
          ref={videoRef}
          loop
          muted
          playsInline
          className="h-full w-full object-contain"
        />
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={`/watch/${short.id}`}
          className="text-sm font-medium hover:underline"
        >
          {short.title}
        </Link>
      </div>
      <Link
        href={`/channel/${short.channel_handle}`}
        className="text-xs text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
      >
        {short.channel_name}
      </Link>
      <p className="text-xs text-black/50 dark:text-white/50">
        {short.views_count} views
      </p>
    </div>
  );
}
