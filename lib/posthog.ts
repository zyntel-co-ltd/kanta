import posthog from "posthog-js";

export function initPostHog() {
  if (typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: "https://eu.posthog.com",
    capture_pageview: false,
    capture_pageleave: true,
    session_recording: { maskAllInputs: true },
    rate_limiting: { events_burst_limit: 100, events_per_second: 10 },
  });
}
