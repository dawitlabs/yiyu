"use client";

import { useRef, useState } from "react";
import { useClickOutside } from "@/lib/use-click-outside";

// Shared trigger-button+panel primitive behind the Save, "..." (watch page),
// and Quality (player) menus. buttonContent/children are plain ReactNode,
// not render-prop functions — a render prop can't be passed from a Server
// Component into a Client Component (functions aren't serializable across
// that boundary), and the watch page that uses this is a Server Component.
export function PopoverButton({
  buttonContent,
  buttonClassName,
  ariaLabel,
  align = "left",
  children,
}: {
  buttonContent: React.ReactNode;
  buttonClassName: string;
  ariaLabel?: string;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setIsOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={ariaLabel}
        className={buttonClassName}
      >
        {buttonContent}
      </button>
      {isOpen && (
        <div
          className={`absolute z-50 mt-2 ${align === "right" ? "right-0" : "left-0"}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
