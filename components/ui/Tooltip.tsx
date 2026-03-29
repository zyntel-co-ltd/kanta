"use client";

import clsx from "clsx";

/**
 * Lightweight tooltip: CSS hover on md+ and native `title` for touch / long-press (ENG-111).
 */
export default function Tooltip({
  label,
  children,
  className,
  side = "top",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  side?: "top" | "right";
}) {
  const bubblePos =
    side === "right"
      ? "left-full top-1/2 ml-2 -translate-y-1/2"
      : "bottom-full left-1/2 mb-1 -translate-x-1/2";
  return (
    <span className={clsx("group relative inline-flex", className)} title={label}>
      {children}
      <span
        className={clsx(
          "pointer-events-none absolute z-50 max-md:hidden whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100",
          bubblePos
        )}
        role="tooltip"
      >
        {label}
      </span>
    </span>
  );
}
