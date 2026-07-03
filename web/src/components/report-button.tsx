"use client";

import { useState } from "react";

export function ReportButton({
  targetType,
  targetId,
  className = "text-sm text-black/60 hover:underline disabled:opacity-50 dark:text-white/60",
}: {
  targetType: "videos" | "comments";
  targetId: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "pending" | "reported">("idle");

  async function handleReport() {
    const reason = prompt("Why are you reporting this?");
    if (!reason) {
      return;
    }

    setState("pending");
    const res = await fetch(`/api/${targetType}/${targetId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setState(res.ok ? "reported" : "idle");
  }

  if (state === "reported") {
    return <span className="text-black/50 dark:text-white/50">Reported</span>;
  }

  return (
    <button
      type="button"
      disabled={state === "pending"}
      onClick={handleReport}
      className={className}
    >
      Report
    </button>
  );
}
