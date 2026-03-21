/**
 * Server-side PostHog client for API routes and server actions.
 * Always call await posthog.shutdown() when done.
 */

import { PostHog } from "posthog-node";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.posthog.com";

let instance: PostHog | null = null;

export function getPostHogServer(): PostHog | null {
  if (!key) return null;
  if (!instance) {
    instance = new PostHog(key, { host });
  }
  return instance;
}
