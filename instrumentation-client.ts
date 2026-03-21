// This file configures client-side initialization (Sentry + PostHog).
// Runs when the app loads in the browser.

import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

// PostHog — lightweight init (Next.js 15.3+)
if (typeof window !== "undefined") {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.posthog.com";
  if (key) {
    posthog.init(key, {
      api_host: host,
      defaults: "2025-05-24",
    });
  }
}

// Sentry
Sentry.init({
  dsn: "https://7faa7f717b89f375876bcdc5d342ca84@o4511080919924736.ingest.us.sentry.io/4511081949954048",

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
