"use client";

import { useAuth } from "@/lib/AuthContext";

export {
  KANTA_FEATURE_FLAG_NAMES,
  FLAG_LABELS,
  getDefaultEnabledFlagsForTier,
  emptyFacilityFlagsMap,
  mergeFacilityFlagsFromRows,
  applyPublicEnvFlagOverrides,
  normalizeCachedFlags,
} from "@/lib/featureFlagCatalog";

export type { KantaFeatureFlagName } from "@/lib/featureFlagCatalog";

/** Maps kebab-case flag names to NEXT_PUBLIC_FLAG_* env keys */
export function flagNameToDevEnvKey(flagName: string): string {
  return `NEXT_PUBLIC_FLAG_${flagName.replace(/-/g, "_").toUpperCase()}`;
}

/**
 * Synchronous read for non-React code (no access to `/api/me` flags).
 * Respects `NEXT_PUBLIC_FLAG_*` only; defaults to false (ENG-161).
 */
export function getFlagValue(flagName: string): boolean {
  const key = flagNameToDevEnvKey(flagName);
  if (typeof process !== "undefined" && process.env) {
    const v = process.env[key];
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return false;
}

/**
 * React hook: flag state from `facilityAuth.flags` (GET `/api/me`) with env overrides.
 * PostHog is not used for evaluation — analytics only.
 */
export function useFlag(flagName: string): boolean {
  const { facilityAuth } = useAuth();
  const envKey = flagNameToDevEnvKey(flagName);
  if (typeof process !== "undefined" && process.env[envKey] === "true") return true;
  if (typeof process !== "undefined" && process.env[envKey] === "false") return false;
  return facilityAuth?.flags?.[flagName] ?? false;
}
