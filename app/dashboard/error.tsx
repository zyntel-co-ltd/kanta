"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[200px]">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
        Dashboard error
      </h2>
      <button
        onClick={reset}
        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm"
      >
        Retry
      </button>
    </div>
  );
}
