"use client";

import { useEffect, useRef } from "react";

// Owns the <video> element so it can hook play/ended directly — view
// recording and watch-history progress both need real playback events,
// not just "the page loaded".
export function VideoPlayer({
  videoId,
  src,
  canRecordHistory,
}: {
  videoId: string;
  src: string;
  canRecordHistory: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    fetch(`/api/videos/${videoId}/view`, { method: "POST" });
  }, [videoId]);

  function handlePlay() {
    if (!canRecordHistory || hasStarted.current) {
      return;
    }
    hasStarted.current = true;
    fetch(`/api/videos/${videoId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress: 0, completed: false }),
    });
  }

  function handleEnded() {
    if (!canRecordHistory) {
      return;
    }
    const duration = Math.round(videoRef.current?.duration ?? 0);
    fetch(`/api/videos/${videoId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress: duration, completed: true }),
    });
  }

  return (
    // biome-ignore lint/a11y/useMediaCaption: no captions/transcripts available yet for user-provided video URLs
    <video
      ref={videoRef}
      src={src}
      controls
      onPlay={handlePlay}
      onEnded={handleEnded}
      className="h-full w-full"
    />
  );
}
