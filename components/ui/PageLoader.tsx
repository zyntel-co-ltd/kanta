"use client";

const BAR_COUNT = 4;

export type LoadingBarsSize = "sm" | "md";

/**
 * Four staggered vertical bars (Lab Metrics pattern). Uses `--module-primary` when set on the layout.
 */
export function LoadingBars({
  className = "",
  size = "md",
  onDark = false,
}: {
  className?: string;
  size?: LoadingBarsSize;
  /** Lighter bars for dark backgrounds (e.g. auth confirm). */
  onDark?: boolean;
}) {
  const barClass =
    size === "sm" ? "h-6 w-1.5 rounded animate-bounce" : "h-8 w-2 rounded animate-bounce";

  const barColor = onDark ? "#34d399" : "var(--module-primary, #0d9488)";

  return (
    <div className={className} role="status" aria-label="Loading">
      <span className="sr-only">Loading</span>
      <div className="flex gap-1">
        {Array.from({ length: BAR_COUNT }, (_, i) => (
          <div
            key={i}
            className={barClass}
            style={{
              backgroundColor: barColor,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export type PageLoaderProps = {
  /** `page` = route segments (tall). `inline` = lab-metrics chart area (fixed height). */
  variant?: "page" | "inline";
  className?: string;
};

export default function PageLoader({ variant = "page", className = "" }: PageLoaderProps) {
  const wrap =
    variant === "inline"
      ? `flex h-64 w-full items-center justify-center px-4 ${className}`.trim()
      : `flex min-h-[60vh] w-full items-center justify-center px-4 ${className}`.trim();

  return (
    <div className={wrap}>
      <LoadingBars />
    </div>
  );
}
