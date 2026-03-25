"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-slate-400 mb-4 text-center max-w-md">
        We&apos;ve been notified. Please try again.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium"
      >
        Try again
      </button>
    </div>
  );
}
