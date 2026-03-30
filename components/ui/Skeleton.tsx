import clsx from "clsx";

type SkeletonProps = {
  className?: string;
  /** Screen-reader label */
  label?: string;
};

/**
 * ENG-109: base pulse block. Compose into page shells or cards.
 */
export default function Skeleton({ className, label = "Loading" }: SkeletonProps) {
  return (
    <div
      className={clsx("animate-pulse rounded-lg bg-slate-200/80", className)}
      aria-hidden={!label}
      aria-label={label}
      role={label ? "status" : undefined}
    />
  );
}
