"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";

/**
 * Captures pageviews on route change. PostHog is initialized in instrumentation-client.ts.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    try {
      if ((posthog as { __loaded?: boolean }).__loaded) {
        posthog.capture("$pageview", { $current_url: pathname });
      }
    } catch {
      // PostHog not initialized
    }
  }, [pathname]);

  return <>{children}</>;
}
