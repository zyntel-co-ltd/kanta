import Skeleton from "@/components/ui/Skeleton";

/**
 * ENG-109: default dashboard route loading UI (replaces spinner-only PageLoader).
 */
export default function DashboardRouteSkeleton() {
  return (
    <div className="min-h-[50vh] space-y-6 p-6" aria-busy="true" aria-label="Loading page">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
      <Skeleton className="h-72 w-full rounded-2xl" />
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
