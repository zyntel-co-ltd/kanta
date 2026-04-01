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
  "show-sample-scan",
  "show-tat-patient-level",
  "show-tat-test-level",
  /** ENG-160: Nakasero-style unmatched tests tab in Admin Panel (API also uses env override). */
  "show-unmatched-tests",
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
 * ENG-110/ENG-63 hardening:
 * If `NEXT_PUBLIC_FLAG_<FLAG>` is explicitly set to "true" or "false", treat it as
 * the source of truth even when PostHog is blocked (net::ERR_BLOCKED_BY_CLIENT).
 */
function readDevFallbackMaybe(flagName: string): boolean | undefined {
  const key = flagNameToDevEnvKey(flagName);
  if (typeof process === "undefined" || !process.env) return undefined;
  const v = process.env[key];
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
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

  // If an explicit env override exists, respect it no matter what PostHog returns.
  const forced = readDevFallbackMaybe(flagName);
  if (forced !== undefined) return forced;

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return readDevFallback(flagName);
  }
  try {
    return posthog.isFeatureEnabled(flagName) ?? false;
  } catch {
    return readDevFallback(flagName);
  }
}

/**
 * React hook: subscribes to PostHog feature flag updates. Fail-closed by default.
 */
export function useFlag(flagName: string): boolean {
  const [enabled, setEnabled] = useState(() => getFlagValue(flagName));

  useEffect(() => {
    const forced = readDevFallbackMaybe(flagName);
    if (forced !== undefined) {
      // Avoid depending on PostHog when an explicit override is present.
      setEnabled(forced);
      return;
    }

    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      setEnabled(readDevFallback(flagName));
      return;
    }

    const update = () => {
      try {
        setEnabled(posthog.isFeatureEnabled(flagName) ?? false);
      } catch {
        setEnabled(readDevFallback(flagName));
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
