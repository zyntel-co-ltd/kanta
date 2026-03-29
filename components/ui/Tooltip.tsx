"use client";

import clsx from "clsx";

/**
 * Lightweight tooltip: CSS hover on md+ and native `title` for touch / long-press (ENG-111).
 */
export default function Tooltip({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={clsx("group relative inline-flex", className)} title={label}>
      {children}
      <span
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 max-md:hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
        role="tooltip"
      >
        {label}
      </span>
    </span>
  );
}
