"use client";

import Hls from "hls.js";
import { type RefObject, useEffect, useRef, useState } from "react";
import { PictureInPictureIcon, SettingsIcon } from "@/components/icons";
import { PopoverButton } from "@/components/popover-button";
import type { Chapter } from "@/lib/chapters";
import { formatTimestamp } from "@/lib/format";
import {
  loadPlayerPreferences,
  savePlayerPreferences,
} from "@/lib/player-preferences";

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <title>Play</title>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <title>Pause</title>
      <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
    </svg>
  );
}

function VolumeIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <title>{muted ? "Unmute" : "Mute"}</title>
      <path d="M4 9v6h4l5 5V4L8 9H4z" />
      {muted ? (
        <path
          d="M16.5 8.5l5 7M21.5 8.5l-5 7"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M16.5 8.5a5 5 0 010 7"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function FullscreenIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <title>{active ? "Exit fullscreen" : "Enter fullscreen"}</title>
      {active ? (
        <path d="M9 3H5a2 2 0 00-2 2v4M15 3h4a2 2 0 012 2v4M9 21H5a2 2 0 01-2-2v-4M15 21h4a2 2 0 002-2v-4" />
      ) : (
        <path d="M3 9V5a2 2 0 012-2h4M21 9V5a2 2 0 00-2-2h-4M3 15v4a2 2 0 002 2h4M21 15v4a2 2 0 01-2 2h-4" />
      )}
    </svg>
  );
}

function CaptionsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      className="h-5 w-5"
    >
      <title>Captions</title>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 10.5c0-.9.7-1.5 1.6-1.5.7 0 1.2.3 1.5.8M7 13.5c0 .9.7 1.5 1.6 1.5.7 0 1.2-.3 1.5-.8M13.4 10.5c0-.9.7-1.5 1.6-1.5.7 0 1.2.3 1.5.8M13.4 13.5c0 .9.7 1.5 1.6 1.5.7 0 1.2-.3 1.5-.8" />
    </svg>
  );
}

// Native <input type="range"> can't render a separate buffered-vs-played
// fill, which is the one visual YouTube's scrubber needs that CSS alone
// can't give a native range — so this one control is hand-rolled; volume
// below stays a native range since it has no buffered concept to show.
function SeekBar({
  currentTime,
  duration,
  bufferedEnd,
  chapters,
  onSeek,
}: {
  currentTime: number;
  duration: number;
  bufferedEnd: number;
  chapters?: Chapter[];
  onSeek: (seconds: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  function fractionFromEvent(e: React.PointerEvent) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      return 0;
    }
    const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
    return x / rect.width;
  }

  function handlePointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging(true);
    onSeek(fractionFromEvent(e) * duration);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (dragging) {
      onSeek(fractionFromEvent(e) * duration);
    }
  }

  const playedPct = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration ? (bufferedEnd / duration) * 100 : 0;

  return (
    <div
      ref={trackRef}
      className="group/seek relative h-1 w-full cursor-pointer touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => setDragging(false)}
    >
      <div className="absolute inset-0 rounded-full bg-white/25" />
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-white/40"
        style={{ width: `${bufferedPct}%` }}
      />
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent)]"
        style={{ width: `${playedPct}%` }}
      />
      {duration > 0 &&
        chapters?.map((chapter) => (
          <div
            key={chapter.id}
            title={chapter.title}
            className="absolute inset-y-0 w-px bg-black/40"
            style={{ left: `${(chapter.start_seconds / duration) * 100}%` }}
          />
        ))}
      <div
        className="-translate-y-1/2 -translate-x-1/2 absolute top-1/2 h-3 w-3 rounded-full bg-[var(--accent)] opacity-0 group-hover/seek:opacity-100"
        style={{ left: `${playedPct}%` }}
      />
    </div>
  );
}

// Shared custom control chrome for both VOD (VideoPlayer) and live
// (LivePlayer) — native <video controls> renders inconsistently across
// browsers and can't be styled to match the rest of the app, so both
// callers pass their <video> element in as children and get this instead.
export function VideoPlayerShell({
  videoRef,
  hlsRef,
  isLive = false,
  hasCaptions = false,
  chapters,
  children,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  hlsRef?: RefObject<Hls | null>;
  isLive?: boolean;
  hasCaptions?: boolean;
  chapters?: Chapter[];
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sideClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashIdRef = useRef(0);
  const [seekFlash, setSeekFlash] = useState<{
    side: "left" | "right";
    id: number;
  } | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<
    { index: number; height: number }[]
  >([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () =>
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    const onProgress = () => {
      const { buffered } = video;
      setBufferedEnd(
        buffered.length > 0 ? buffered.end(buffered.length - 1) : 0,
      );
    };
    const onVolumeChange = () => {
      setVolumeState(video.volume);
      setIsMuted(video.muted);
    };
    const onRateChange = () => setPlaybackRateState(video.playbackRate);
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onCanPlay = () => setIsBuffering(false);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("progress", onProgress);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("ratechange", onRateChange);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onCanPlay);

    // Applied once here rather than via useState initializers — those run
    // before the video element exists, too early to set anything on it.
    const prefs = loadPlayerPreferences();
    video.volume = prefs.volume;
    video.muted = prefs.volume === 0;
    video.playbackRate = prefs.playbackRate;

    // If metadata already loaded before this effect ran (e.g. a cached
    // local video loads faster than React's post-paint effect timing),
    // the events above already fired and won't fire again — read the
    // current state directly so the UI doesn't get stuck at its defaults.
    onDurationChange();
    onTimeUpdate();
    onProgress();
    onVolumeChange();
    onRateChange();
    if (!video.paused) {
      setIsPlaying(true);
    }
    if (hasCaptions) {
      setCaptionsOn(video.textTracks[0]?.mode === "showing");
    }
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("progress", onProgress);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("ratechange", onRateChange);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onCanPlay);
    };
  }, [videoRef, hasCaptions]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    setIsPiPSupported(
      document.pictureInPictureEnabled && !video.disablePictureInPicture,
    );

    function onEnterPiP() {
      setIsPiPActive(true);
    }
    function onLeavePiP() {
      setIsPiPActive(false);
    }
    video.addEventListener("enterpictureinpicture", onEnterPiP);
    video.addEventListener("leavepictureinpicture", onLeavePiP);
    return () => {
      video.removeEventListener("enterpictureinpicture", onEnterPiP);
      video.removeEventListener("leavepictureinpicture", onLeavePiP);
    };
  }, [videoRef]);

  // No deps — same reasoning as the keydown effect below: the parent
  // creates the Hls instance in its own effect, which (React fires child
  // effects before parent effects) can still be null the first time this
  // runs, so re-checking every render is what actually catches it once set.
  useEffect(() => {
    const hls = hlsRef?.current;
    if (!hls) {
      return;
    }

    function onManifestParsed() {
      if (!hls) {
        return;
      }
      const levels = hls.levels.map((level, index) => ({
        index,
        height: level.height,
      }));
      setQualityLevels(levels);

      const preferredHeight = loadPlayerPreferences().qualityHeight;
      const match = levels.find((level) => level.height === preferredHeight);
      if (match) {
        hls.currentLevel = match.index;
      }
    }
    function onLevelSwitched(_event: unknown, data: { level: number }) {
      setCurrentLevel(data.level);
    }

    hls.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
    hls.on(Hls.Events.LEVEL_SWITCHED, onLevelSwitched);
    if (hls.levels.length > 0) {
      onManifestParsed();
    }
    return () => {
      hls.off(Hls.Events.MANIFEST_PARSED, onManifestParsed);
      hls.off(Hls.Events.LEVEL_SWITCHED, onLevelSwitched);
    };
  });

  function scheduleHide() {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 2500);
  }

  function handleMouseMove() {
    setShowControls(true);
    scheduleHide();
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (video.paused) {
      // play() rejects (unhandled otherwise) if the click lands before the
      // source is actually ready — e.g. hls.js hasn't attached a MediaSource
      // yet for a live stream. Nothing useful to do but ignore it; the
      // player naturally starts once the source is ready.
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  function skip(delta: number) {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.currentTime = Math.min(
      Math.max(video.currentTime + delta, 0),
      duration || video.currentTime + delta,
    );
  }

  function toggleMute() {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      savePlayerPreferences({ volume: video.muted ? 0 : video.volume });
    }
  }

  function handleVolumeChange(fraction: number) {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.volume = fraction;
    video.muted = fraction === 0;
    savePlayerPreferences({ volume: fraction });
  }

  function toggleFullscreen() {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }

  function selectQuality(levelIndex: number) {
    const hls = hlsRef?.current;
    if (!hls) {
      return;
    }
    hls.currentLevel = levelIndex;
    const level = qualityLevels.find((l) => l.index === levelIndex);
    savePlayerPreferences({ qualityHeight: level?.height ?? null });
  }

  function setPlaybackRate(rate: number) {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.playbackRate = rate;
    savePlayerPreferences({ playbackRate: rate });
  }

  function togglePictureInPicture() {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else {
      video.requestPictureInPicture().catch(() => {});
    }
  }

  function toggleCaptions() {
    const video = videoRef.current;
    const track = video?.textTracks[0];
    if (!track) {
      return;
    }
    const next = !captionsOn;
    track.mode = next ? "showing" : "hidden";
    setCaptionsOn(next);
  }

  // Double-click (not single) on the left/right thirds seeks +-10s, matching
  // YouTube's own gesture — single-click anywhere (including these zones)
  // still toggles play/pause. That needs real click-vs-double-click
  // disambiguation, not just both firing: without the short delay, a real
  // double-click would also fire two independent single-clicks first,
  // visibly pausing-then-resuming before the seek landed. The center zone
  // skips all this and keeps today's instant, undelayed toggle — most
  // clicks land there, and delaying that would feel laggy for no reason.
  function handleSideClick() {
    if (sideClickTimerRef.current) {
      clearTimeout(sideClickTimerRef.current);
    }
    sideClickTimerRef.current = setTimeout(() => {
      sideClickTimerRef.current = null;
      togglePlay();
    }, 250);
  }

  function handleSideDoubleClick(side: "left" | "right") {
    if (sideClickTimerRef.current) {
      clearTimeout(sideClickTimerRef.current);
      sideClickTimerRef.current = null;
    }
    skip(side === "left" ? -10 : 10);
    flashIdRef.current += 1;
    setSeekFlash({ side, id: flashIdRef.current });
    if (seekFlashTimerRef.current) {
      clearTimeout(seekFlashTimerRef.current);
    }
    seekFlashTimerRef.current = setTimeout(() => setSeekFlash(null), 650);
  }

  // Attached imperatively (not a JSX onKeyDown) so shortcuts fire no matter
  // which inner control has focus — a real <button> owns every click
  // target, this just adds the keyboard scope around the whole player, the
  // same pattern real video players use. Re-subscribes each render so the
  // closure always sees current volume/duration; the video element itself
  // fires far less often than that would cost.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    container.tabIndex = 0;

    function onKeyDown(e: KeyboardEvent) {
      // Number row seeks to N*10% of duration, same as YouTube — checked
      // ahead of the switch since "any digit" doesn't fit a single case.
      if (!isLive && duration > 0 && /^[0-9]$/.test(e.key)) {
        const video = videoRef.current;
        if (video) {
          video.currentTime = (Number(e.key) / 10) * duration;
        }
        return;
      }

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          skip(-5);
          break;
        case "ArrowRight":
          skip(5);
          break;
        case "j":
          if (!isLive) {
            skip(-10);
          }
          break;
        case "l":
          if (!isLive) {
            skip(10);
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          handleVolumeChange(Math.min(volume + 0.1, 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          handleVolumeChange(Math.max(volume - 0.1, 0));
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          toggleFullscreen();
          break;
        // "," / "." step one frame (~1/30s, an approximation — no real
        // per-video fps is exposed) when paused; Shift+,/. (reported by the
        // browser as "<"/">" on a US layout) instead nudges playback speed.
        case ",":
        case "<":
          if (e.shiftKey || e.key === "<") {
            setPlaybackRate(Math.max(playbackRate - 0.25, 0.25));
          } else if (!isLive && videoRef.current?.paused) {
            skip(-1 / 30);
          }
          break;
        case ".":
        case ">":
          if (e.shiftKey || e.key === ">") {
            setPlaybackRate(Math.min(playbackRate + 0.25, 2));
          } else if (!isLive && videoRef.current?.paused) {
            skip(1 / 30);
          }
          break;
        case "Home":
          if (!isLive) {
            e.preventDefault();
            skip(-duration);
          }
          break;
        case "End":
          if (!isLive) {
            e.preventDefault();
            skip(duration);
          }
          break;
        default:
          break;
      }
    }

    container.addEventListener("keydown", onKeyDown);
    return () => container.removeEventListener("keydown", onKeyDown);
  });

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: mouse-only auto-hide tracking, not a control — every actual control is a real <button> below, and the keyboard scope is attached imperatively above
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="group relative aspect-video overflow-hidden rounded-lg bg-black outline-none"
    >
      {children}

      <div className="absolute inset-0 flex">
        <button
          type="button"
          onClick={() => handleSideClick()}
          onDoubleClick={() => handleSideDoubleClick("left")}
          aria-label="Play/pause, double-click to rewind 10 seconds"
          className="relative h-full w-1/3"
        >
          {seekFlash?.side === "left" && (
            <span
              key={seekFlash.id}
              className="absolute inset-0 flex items-center justify-center text-sm text-white"
            >
              <span className="rounded-full bg-black/50 px-3 py-1.5">
                « 10s
              </span>
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex h-full w-1/3 items-center justify-center"
        >
          {!isPlaying && (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white">
              <PlayIcon />
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSideClick()}
          onDoubleClick={() => handleSideDoubleClick("right")}
          aria-label="Play/pause, double-click to skip ahead 10 seconds"
          className="relative h-full w-1/3"
        >
          {seekFlash?.side === "right" && (
            <span
              key={seekFlash.id}
              className="absolute inset-0 flex items-center justify-center text-sm text-white"
            >
              <span className="rounded-full bg-black/50 px-3 py-1.5">
                10s »
              </span>
            </span>
          )}
        </button>
      </div>

      {isBuffering && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6 transition-opacity ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {!isLive && (
          <SeekBar
            currentTime={currentTime}
            duration={duration}
            bufferedEnd={bufferedEnd}
            chapters={chapters}
            onSeek={(seconds) => {
              const video = videoRef.current;
              if (video) {
                video.currentTime = seconds;
              }
            }}
          />
        )}

        <div className="mt-2 flex items-center gap-3 text-white">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="rounded-full p-1 hover:bg-white/15"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className="rounded-full p-1 hover:bg-white/15"
          >
            <VolumeIcon muted={isMuted || volume === 0} />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="h-1 w-16 accent-white"
            aria-label="Volume"
          />

          {isLive ? (
            <span className="flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              LIVE
            </span>
          ) : (
            <span className="text-white/80 text-xs tabular-nums">
              {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
            </span>
          )}

          <div className="flex-1" />

          {hasCaptions && (
            <button
              type="button"
              onClick={toggleCaptions}
              aria-label="Toggle captions"
              className={`rounded-full p-1 hover:bg-white/15 ${
                captionsOn ? "text-white" : "text-white/50"
              }`}
            >
              <CaptionsIcon />
            </button>
          )}

          <PopoverButton
            align="right"
            ariaLabel="Playback speed"
            buttonClassName="rounded-full px-2 py-1 text-xs hover:bg-white/15"
            buttonContent={`${playbackRate}x`}
          >
            <div className="min-w-20 rounded-lg border border-white/10 bg-black/90 py-1 text-sm text-white shadow-lg">
              {PLAYBACK_RATES.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setPlaybackRate(rate)}
                  className={`block w-full px-3 py-1.5 text-left hover:bg-white/10 ${
                    playbackRate === rate ? "font-medium" : "text-white/70"
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </PopoverButton>

          {isPiPSupported && (
            <button
              type="button"
              onClick={togglePictureInPicture}
              aria-label={
                isPiPActive
                  ? "Exit picture-in-picture"
                  : "Enter picture-in-picture"
              }
              className="rounded-full p-1 hover:bg-white/15"
            >
              <PictureInPictureIcon />
            </button>
          )}

          {qualityLevels.length > 0 && (
            <PopoverButton
              align="right"
              ariaLabel="Quality"
              buttonClassName="rounded-full p-1 hover:bg-white/15"
              buttonContent={<SettingsIcon />}
            >
              <div className="min-w-28 rounded-lg border border-white/10 bg-black/90 py-1 text-sm text-white shadow-lg">
                <button
                  type="button"
                  onClick={() => selectQuality(-1)}
                  className={`block w-full px-3 py-1.5 text-left hover:bg-white/10 ${
                    currentLevel === -1 ? "font-medium" : "text-white/70"
                  }`}
                >
                  Auto
                </button>
                {[...qualityLevels]
                  .sort((a, b) => b.height - a.height)
                  .map((level) => (
                    <button
                      key={level.index}
                      type="button"
                      onClick={() => selectQuality(level.index)}
                      className={`block w-full px-3 py-1.5 text-left hover:bg-white/10 ${
                        currentLevel === level.index
                          ? "font-medium"
                          : "text-white/70"
                      }`}
                    >
                      {level.height}p
                    </button>
                  ))}
              </div>
            </PopoverButton>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="rounded-full p-1 hover:bg-white/15"
          >
            <FullscreenIcon active={isFullscreen} />
          </button>
        </div>
      </div>
    </div>
  );
}
