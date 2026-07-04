"use client";

import { useState } from "react";
import { formatRelativeTime } from "@/lib/format";

export function VideoDescription({
  viewsCount,
  uploadedAt,
  description,
}: {
  viewsCount: number;
  uploadedAt: string;
  description: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-3 rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.06]">
      <p className="text-sm font-medium">
        {viewsCount} views · {formatRelativeTime(uploadedAt)}
      </p>
      {description && (
        <>
          <p
            className={`mt-2 whitespace-pre-wrap text-sm text-black/80 dark:text-white/80 ${
              isExpanded ? "" : "line-clamp-3"
            }`}
          >
            {description}
          </p>
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="mt-1 text-sm font-medium hover:text-black/70 dark:hover:text-white/70"
          >
            {isExpanded ? "Show less" : "...more"}
          </button>
        </>
      )}
    </div>
  );
}
