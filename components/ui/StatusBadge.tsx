import clsx from "clsx";

export type StatusBadgeVariant = "ok" | "warn" | "bad" | "info" | "neutral";

const variantClass: Record<StatusBadgeVariant, string> = {
  ok: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warn: "bg-amber-50 text-amber-900 border-amber-200",
  bad: "bg-red-50 text-red-800 border-red-200",
  info: "bg-blue-50 text-blue-800 border-blue-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
};

/**
 * Semantic status only — not for brand decoration (Plan §9).
 */
export default function StatusBadge({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: StatusBadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
        variantClass[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
