"use client";

import Hls from "hls.js";
import { useEffect, useRef } from "react";
import { VideoPlayerShell } from "@/components/video-controls";

// Live playback only — no view/progress tracking like VideoPlayer has,
// since there's no video row to attach that history to.
export function LivePlayer({ hlsUrl }: { hlsUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) {
      return;
    }

    // Browsers block unmuted autoplay without a user gesture — play()
    // rejects silently (the .catch below was hiding exactly that), so the
    // stream would attach and buffer but never actually start. Muted
    // autoplay is exempt from that policy; the shell's mute button lets the
    // viewer unmute afterward, same as YouTube's own live player.
    videoEl.muted = true;

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
    // Without this, a fatal error (a network blip, a codec the browser
    // rejects) leaves playback silently stuck forever — hls.js's own
    // recommended recovery is to reload on a network error and attempt a
    // MediaSource recover on a media error; anything else isn't recoverable.
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) {
        return;
      }
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          hls.startLoad();
          break;
        case Hls.ErrorTypes.MEDIA_ERROR:
          hls.recoverMediaError();
          break;
        default:
          hls.destroy();
          break;
      }
    });
    return () => hls.destroy();
  }, [hlsUrl]);

  return (
    <VideoPlayerShell videoRef={videoRef} isLive>
      {/* biome-ignore lint/a11y/useMediaCaption: live stream, no track source exists */}
      <video ref={videoRef} className="h-full w-full" />
    </VideoPlayerShell>
  );
}
