"use client";

import { useRef, useState } from "react";

type Status = "idle" | "previewing" | "live";

// Publishes straight from the browser via WHIP (WebRTC-HTTP ingest) — no
// OBS, no separate app. MediaMTX (the same server OBS would push RTMP to)
// accepts WHIP natively, so this is just the browser's own camera/screen
// capture and WebRTC APIs talking to it directly.
export function BroadcastPanel({ whipUrl }: { whipUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const resourceUrlRef = useRef<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function startPreview(source: "camera" | "screen") {
    setError(null);
    try {
      const stream =
        source === "camera"
          ? await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            })
          : await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: true,
            });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStatus("previewing");
    } catch {
      setError(
        source === "camera"
          ? "Camera/mic permission denied or unavailable."
          : "Screen share was cancelled or unavailable.",
      );
    }
  }

  async function startBroadcast() {
    const stream = streamRef.current;
    if (!stream) {
      return;
    }
    setError(null);

    const pc = new RTCPeerConnection();
    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream);
    }

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);

      const res = await fetch(whipUrl, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: pc.localDescription?.sdp,
      });
      if (!res.ok) {
        throw new Error(`WHIP publish failed: ${res.status}`);
      }

      const answerSdp = await res.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      // Not every deployment exposes the Location header cross-origin
      // (Access-Control-Expose-Headers) — when it's missing, stopping still
      // works, MediaMTX just notices the dropped connection instead of
      // getting an explicit DELETE.
      const location = res.headers.get("Location");
      resourceUrlRef.current = location
        ? new URL(location, whipUrl).toString()
        : null;

      pcRef.current = pc;
      setStatus("live");
    } catch {
      pc.close();
      setError("Failed to start the broadcast. Is MediaMTX reachable?");
    }
  }

  function stopBroadcast() {
    pcRef.current?.close();
    pcRef.current = null;
    if (resourceUrlRef.current) {
      fetch(resourceUrlRef.current, { method: "DELETE" }).catch(() => {});
      resourceUrlRef.current = null;
    }
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus("idle");
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-black/15 p-3 dark:border-white/15">
      <p className="text-sm font-medium">Broadcast from this browser</p>

      <div className="aspect-video overflow-hidden rounded-md bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-contain"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {status === "idle" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => startPreview("camera")}
            className="rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
          >
            Use camera
          </button>
          <button
            type="button"
            onClick={() => startPreview("screen")}
            className="rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
          >
            Share screen
          </button>
        </div>
      )}

      {status === "previewing" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={startBroadcast}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white"
          >
            Go live
          </button>
          <button
            type="button"
            onClick={stopBroadcast}
            className="rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
          >
            Cancel
          </button>
        </div>
      )}

      {status === "live" && (
        <button
          type="button"
          onClick={stopBroadcast}
          className="self-start rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
        >
          End broadcast
        </button>
      )}
    </div>
  );
}

function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    function check() {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    }
    pc.addEventListener("icegatheringstatechange", check);
  });
}
