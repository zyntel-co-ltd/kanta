"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { initPostHog } from "@/lib/posthog";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    try {
      posthog.capture("$pageview", { $current_url: pathname });
    } catch {
      // PostHog not initialized
    }
  }, [pathname]);

  return <>{children}</>;
}
