"use client";

import Hls from "hls.js";
import { useEffect, useRef } from "react";

// Live playback only — no view/progress tracking like VideoPlayer has,
// since there's no video row to attach that history to.
export function LivePlayer({ hlsUrl }: { hlsUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) {
      return;
    }

    if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
      videoEl.src = hlsUrl;
      videoEl.play().catch(() => {});
      return;
    }

    if (!Hls.isSupported()) {
      return;
    }

    const hls = new Hls();
    hls.loadSource(hlsUrl);
    hls.attachMedia(videoEl);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      videoEl.play().catch(() => {});
    });
    return () => hls.destroy();
  }, [hlsUrl]);

  return (
    <div className="aspect-video overflow-hidden rounded-lg bg-black">
      {/* biome-ignore lint/a11y/useMediaCaption: live stream, no track source exists */}
      <video ref={videoRef} controls className="h-full w-full" />
    </div>
  );
}
