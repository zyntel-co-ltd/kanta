"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";

/**
 * Canonical PostHog feature flag keys (kebab-case, per-facility via PostHog).
 * Source of truth for product gating — hospitals do not toggle these in-app (ENG-84).
 * Inventory: `zyntel-playbook/12-projects/kanta/feature-flags.md`
 */
export const KANTA_FEATURE_FLAG_NAMES = [
  "show-ai-intelligence",
  "show-lrids",
  "show-reception-tab",
  "show-refrigerator-module",
] as const;

export type KantaFeatureFlagName = (typeof KANTA_FEATURE_FLAG_NAMES)[number];

/** Maps PostHog kebab-case flag names to NEXT_PUBLIC_FLAG_* env keys */
export function flagNameToDevEnvKey(flagName: string): string {
  return `NEXT_PUBLIC_FLAG_${flagName.replace(/-/g, "_").toUpperCase()}`;
}

function readDevFallback(flagName: string): boolean {
  const key = flagNameToDevEnvKey(flagName);
  if (typeof process === "undefined" || !process.env) return false;
  return process.env[key] === "true";
}

/**
 * Synchronous flag read for non-React code. Fail-closed when PostHog is unavailable.
 * When NEXT_PUBLIC_POSTHOG_KEY is unset, uses NEXT_PUBLIC_FLAG_<FLAG> env (see flagNameToDevEnvKey).
 */
export function getFlagValue(flagName: string): boolean {
  if (typeof window === "undefined") {
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) return false;
    return readDevFallback(flagName);
  }
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return readDevFallback(flagName);
  }
  try {
    return posthog.isFeatureEnabled(flagName) ?? false;
  } catch {
    return false;
  }
}

/**
 * React hook: subscribes to PostHog feature flag updates. Fail-closed by default.
 */
export function useFlag(flagName: string): boolean {
  const [enabled, setEnabled] = useState(() => getFlagValue(flagName));

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      setEnabled(readDevFallback(flagName));
      return;
    }

    const update = () => {
      try {
        setEnabled(posthog.isFeatureEnabled(flagName) ?? false);
      } catch {
        setEnabled(false);
      }
    };

    update();
    const unsubscribe = posthog.onFeatureFlags(update);
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [flagName]);

  return enabled;
}
