"use client";

import { useEffect } from "react";

// Fires once per page load, not once per replay — this only needs to prove
// a viewer opened the page, not track rewatch behavior.
export function ViewRecorder({ videoId }: { videoId: string }) {
  useEffect(() => {
    fetch(`/api/videos/${videoId}/view`, { method: "POST" });
  }, [videoId]);

  return null;
}
