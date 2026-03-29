/**
 * Route-segment loading UI (ENG-129) — static Tailwind classes only.
 * Colors align with ENG-131 module map (teal / sky / indigo / emerald / slate).
 */
const BORDER_BY_COLOR = {
  teal: "border-teal-600 border-t-transparent",
  sky: "border-sky-600 border-t-transparent",
  indigo: "border-indigo-600 border-t-transparent",
  emerald: "border-emerald-600 border-t-transparent",
  slate: "border-slate-500 border-t-transparent",
} as const;

export type PageLoaderColor = keyof typeof BORDER_BY_COLOR;

export default function PageLoader({ color }: { color: PageLoaderColor }) {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center px-4">
      <div
        className={`h-8 w-8 animate-spin rounded-full border-4 ${BORDER_BY_COLOR[color]}`}
        aria-label="Loading"
        role="status"
      />
    </div>
  );
}
