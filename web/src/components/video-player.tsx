"use client";

import Hls from "hls.js";
import { useEffect, useRef } from "react";
import { VideoPlayerShell } from "@/components/video-controls";
import type { Caption } from "@/lib/captions";
import type { Chapter } from "@/lib/chapters";
import { formatTimestamp } from "@/lib/format";

// Owns the <video> element so it can hook play/ended directly — view
// recording and watch-history progress both need real playback events,
// not just "the page loaded". Chapters are rendered here too since seeking
// needs direct access to the same videoRef.
export function VideoPlayer({
  videoId,
  src,
  canRecordHistory,
  captions = [],
  chapters = [],
}: {
  videoId: string;
  src: string;
  canRecordHistory: boolean;
  captions?: Caption[];
  chapters?: Chapter[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    fetch(`/api/videos/${videoId}/view`, { method: "POST" });
  }, [videoId]);

  // Chrome/Firefox have no built-in HLS support, so an .m3u8 source needs
  // hls.js to demux it into something <video> can play. Safari plays HLS
  // natively and hls.js has to stay out of its way.
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !src.endsWith(".m3u8")) {
      return;
    }

    if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
      videoEl.src = src;
      return;
    }

    if (!Hls.isSupported()) {
      return;
    }

    const hls = new Hls();
    hlsRef.current = hls;
    hls.loadSource(src);
    hls.attachMedia(videoEl);
    return () => {
      hlsRef.current = null;
      hls.destroy();
    };
  }, [src]);

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

  function handleSeek(seconds: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  }

  return (
    <div>
      <VideoPlayerShell
        videoRef={videoRef}
        hlsRef={hlsRef}
        hasCaptions={captions.length > 0}
      >
        {/* biome-ignore lint/a11y/useMediaCaption: tracks come from a dynamic captions array; biome can't verify one is always present, but real videos with caption tracks uploaded do have one */}
        <video
          ref={videoRef}
          src={src.endsWith(".m3u8") ? undefined : src}
          onPlay={handlePlay}
          onEnded={handleEnded}
          className="h-full w-full"
        >
          {captions.map((c) => (
            <track
              key={c.id}
              kind="subtitles"
              src={c.url}
              srcLang={c.language}
              label={c.label}
              default={c.is_default}
            />
          ))}
        </video>
      </VideoPlayerShell>

      {chapters.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chapters.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSeek(c.start_seconds)}
              className="rounded-md border border-black/15 px-2 py-1 text-xs hover:bg-black/[0.03] dark:border-white/15 dark:hover:bg-white/[0.03]"
            >
              {formatTimestamp(c.start_seconds)} {c.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
