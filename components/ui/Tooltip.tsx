"use client";

import clsx from "clsx";
import { useCallback, useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Tooltip with portal + fixed positioning so labels are not clipped by
 * `overflow-y-auto` ancestors (e.g. sidebar nav). Falls back to `title` on touch.
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
  side?: "top" | "right" | "left";
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const computePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    if (side === "right") {
      setPos({ top: r.top + r.height / 2, left: r.right + margin });
    } else if (side === "left") {
      setPos({ top: r.top + r.height / 2, left: r.left - margin });
    } else {
      setPos({ top: r.top - margin, left: r.left + r.width / 2 });
    }
  }, [side]);

  useLayoutEffect(() => {
    if (!open) return;
    computePosition();
    const onScroll = () => computePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, computePosition]);

  const transform =
    side === "right"
      ? "translateY(-50%)"
      : side === "left"
        ? "translate(-100%, -50%)"
        : "translate(-50%, -100%)";

  return (
    <span
      ref={triggerRef}
      className={clsx("relative inline-flex", className)}
      title={label}
      onMouseEnter={() => {
        computePosition();
        setOpen(true);
      }}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => {
        computePosition();
        setOpen(true);
      }}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              transform,
              zIndex: 9999,
            }}
            className={clsx(
              "pointer-events-none max-md:hidden",
              "max-w-[min(18rem,calc(100vw-1.5rem))] whitespace-normal break-words rounded-md bg-slate-800 px-2.5 py-1.5 text-left text-xs leading-snug text-white shadow-md"
            )}
            role="tooltip"
          >
            {label}
          </span>,
          document.body
        )}
    </span>
  );
}
