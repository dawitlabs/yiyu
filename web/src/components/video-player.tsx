"use client";

import Hls from "hls.js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EndScreenOverlay } from "@/components/end-screen-overlay";
import { VideoPlayerShell } from "@/components/video-controls";
import type { Caption } from "@/lib/captions";
import type { Chapter } from "@/lib/chapters";
import type { EndScreen } from "@/lib/videos";
import { formatTimestamp } from "@/lib/format";
import {
  loadPlayerPreferences,
  savePlayerPreferences,
} from "@/lib/player-preferences";

const AUTOPLAY_COUNTDOWN_SECONDS = 5;

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
  endScreens = [],
  nextVideo,
}: {
  videoId: string;
  src: string;
  canRecordHistory: boolean;
  captions?: Caption[];
  chapters?: Chapter[];
  endScreens?: EndScreen[];
  nextVideo?: { id: string; title: string; thumbnailUrl: string };
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hasStarted = useRef(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [countdown, setCountdown] = useState(AUTOPLAY_COUNTDOWN_SECONDS);

  useEffect(() => {
    setAutoplayEnabled(loadPlayerPreferences().autoplayEnabled);
  }, []);

  // Counts down only while there's actually a next video to autoplay to and
  // the end-card is showing; cancelling (or the countdown reaching zero)
  // clears itself via the returned cleanup, so there's never more than one
  // interval running.
  useEffect(() => {
    if (!hasEnded || !nextVideo || !autoplayEnabled) {
      return;
    }
    if (countdown <= 0) {
      router.push(`/watch/${nextVideo.id}`);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [hasEnded, nextVideo, autoplayEnabled, countdown, router]);

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
    // A manual replay after the end-card showed (without navigating away)
    // should dismiss it — this runs regardless of canRecordHistory, unlike
    // the progress-tracking below which is a logged-in-only feature.
    setHasEnded(false);
    setCountdown(AUTOPLAY_COUNTDOWN_SECONDS);

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
    setHasEnded(true);

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

  function cancelAutoplay() {
    setHasEnded(false);
  }

  function toggleAutoplayEnabled() {
    const next = !autoplayEnabled;
    setAutoplayEnabled(next);
    savePlayerPreferences({ autoplayEnabled: next });
  }

  return (
    <div>
      <VideoPlayerShell
        videoRef={videoRef}
        hlsRef={hlsRef}
        hasCaptions={captions.length > 0}
        chapters={chapters}
      >
        {/* biome-ignore lint/a11y/useMediaCaption: tracks come from a dynamic captions array; biome can't verify one is always present, but real videos with caption tracks uploaded do have one */}
        <video
          ref={videoRef}
          src={src.endsWith(".m3u8") ? undefined : src}
          onPlay={handlePlay}
          onEnded={handleEnded}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
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

        {endScreens.length > 0 && !hasEnded && (
          <EndScreenOverlay
            endScreens={endScreens}
            currentTime={currentTime}
            duration={videoRef.current?.duration ?? 0}
          />
        )}

        {hasEnded && nextVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 p-4 text-center text-white">
            <Link href={`/watch/${nextVideo.id}`} className="flex gap-3">
              <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-white/10">
                {nextVideo.thumbnailUrl && (
                  // biome-ignore lint/performance/noImgElement: thumbnailUrl is an arbitrary external host, next/image's remotePatterns can't allowlist unknown hosts
                  <img
                    src={nextVideo.thumbnailUrl}
                    alt={nextVideo.title}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="max-w-48 text-left">
                <p className="text-white/60 text-xs">
                  {autoplayEnabled
                    ? `Playing next in ${countdown}…`
                    : "Up next"}
                </p>
                <p className="line-clamp-2 font-medium text-sm">
                  {nextVideo.title}
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-3 text-xs">
              {autoplayEnabled && (
                <button
                  type="button"
                  onClick={cancelAutoplay}
                  className="rounded-full border border-white/30 px-3 py-1.5 hover:bg-white/10"
                >
                  Cancel
                </button>
              )}
              <label className="flex items-center gap-1.5 text-white/70">
                <input
                  type="checkbox"
                  checked={autoplayEnabled}
                  onChange={toggleAutoplayEnabled}
                  className="accent-white"
                />
                Autoplay
              </label>
            </div>
          </div>
        )}
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
