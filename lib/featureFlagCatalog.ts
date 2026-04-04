/**
 * Server-safe catalog: flag keys, labels, tier ceilings, tier defaults (ENG-158, ENG-187).
 * Imported by API routes and re-exported from `lib/featureFlags.ts` for the client.
 */

/**
 * Canonical Kanta feature flag keys (kebab-case, per-facility via `facility_flags` + `/api/me`).
 * Keep in sync with `zyntel-playbook/12-projects/kanta/feature-flags.md`.
 */
export const KANTA_FEATURE_FLAG_NAMES = [
  "show-ai-intelligence",
  "show-lrids",
  "show-reception-tab",
  "show-refrigerator-module",
  "show-sample-scan",
  "show-tat-patient-level",
  "show-tat-test-level",
  "show-unmatched-tests",
  "show-qc-module",
  "show-data-bridge",
] as const;

export type KantaFeatureFlagName = (typeof KANTA_FEATURE_FLAG_NAMES)[number];

/** Plan tier ordering — used for ceiling checks (ENG-187). */
export const TIER_ORDER = ["free", "starter", "pro", "enterprise"] as const;
export type SubscriptionTierKey = (typeof TIER_ORDER)[number];

export function normalizeSubscriptionTier(tier: string | null | undefined): SubscriptionTierKey {
  const t = (tier ?? "free").trim().toLowerCase();
  if (t === "free") return "free";
  if (t === "starter") return "starter";
  if (t === "pro" || t === "professional") return "pro";
  if (t === "enterprise") return "enterprise";
  return "free";
}

function tierOrderIndex(tier: string | null | undefined): number {
  return TIER_ORDER.indexOf(normalizeSubscriptionTier(tier));
}

/**
 * Minimum subscription tier required for a flag to be eligible (ENG-187).
 * Plan tier is the ceiling; `facility_flags` only apply within this ceiling.
 */
export const FLAG_TIER_REQUIREMENTS: Record<KantaFeatureFlagName, SubscriptionTierKey> = {
  "show-ai-intelligence": "pro",
  "show-lrids": "pro",
  "show-reception-tab": "pro",
  "show-refrigerator-module": "starter",
  "show-sample-scan": "starter",
  "show-tat-patient-level": "pro",
  "show-tat-test-level": "pro",
  "show-unmatched-tests": "pro",
  "show-qc-module": "pro",
  "show-data-bridge": "enterprise",
};

export function isFlagAllowedForTier(flagName: string, tier: string | null): boolean {
  const req = FLAG_TIER_REQUIREMENTS[flagName as KantaFeatureFlagName];
  if (req === undefined) return true;
  return tierOrderIndex(tier) >= TIER_ORDER.indexOf(req);
}

/** All keys false — base map before overlaying DB rows or env (ENG-161). */
export function emptyFacilityFlagsMap(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const name of KANTA_FEATURE_FLAG_NAMES) {
    out[name] = false;
  }
  return out;
}

/**
 * Normalize cached or partial API `flags` (e.g. pre-ENG-161 sessionStorage) to a full map.
 */
export function normalizeCachedFlags(raw: unknown): Record<string, boolean> {
  const base = emptyFacilityFlagsMap();
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const k of KANTA_FEATURE_FLAG_NAMES) {
      const v = (raw as Record<string, unknown>)[k];
      if (typeof v === "boolean") base[k] = v;
    }
  }
  return base;
}

/** Merge `facility_flags` rows onto the default-all-false map. */
export function mergeFacilityFlagsFromRows(
  rows: Array<{ flag_key: string; enabled: boolean }> | null | undefined
): Record<string, boolean> {
  const out = emptyFacilityFlagsMap();
  for (const r of rows ?? []) {
    if ((KANTA_FEATURE_FLAG_NAMES as readonly string[]).includes(r.flag_key)) {
      out[r.flag_key] = !!r.enabled;
    }
  }
  return out;
}

/**
 * Server or client: `NEXT_PUBLIC_FLAG_<KEY>` overrides (true/false) for emergency rollouts.
 */
export function applyPublicEnvFlagOverrides(flags: Record<string, boolean>): Record<string, boolean> {
  const out = { ...flags };
  for (const name of KANTA_FEATURE_FLAG_NAMES) {
    const envKey = `NEXT_PUBLIC_FLAG_${name.toUpperCase().replace(/-/g, "_")}`;
    const v = process.env[envKey];
    if (v === "true") out[name] = true;
    if (v === "false") out[name] = false;
  }
  return out;
}

export const FLAG_LABELS: Record<
  string,
  { label: string; description: string }
> = {
  "show-ai-intelligence": {
    label: "AI Insights",
    description: "AI natural language queries and weekly summaries",
  },
  "show-lrids": {
    label: "LRIDS Board",
    description: "Patient-facing waiting room display board",
  },
  "show-reception-tab": {
    label: "Reception Tab",
    description: "Manual section time-in/out capture in TAT",
  },
  "show-refrigerator-module": {
    label: "Refrigerator",
    description: "Cold chain temperature monitoring",
  },
  "show-sample-scan": {
    label: "Sample Scan",
    description: "Barcode scan mode for sample lookup",
  },
  "show-tat-patient-level": {
    label: "Patient-Level TAT",
    description: "Patient-level turnaround time tracker",
  },
  "show-tat-test-level": {
    label: "Test-Level TAT",
    description: "Professional test-level TAT tracker",
  },
  "show-unmatched-tests": {
    label: "Unmatched Tests",
    description: "Admin tab for LIMS codes not yet in Meta catalogue",
  },
  "show-qc-module": {
    label: "QC Module",
    description: "Quality control configuration, entry, and charts",
  },
  "show-data-bridge": {
    label: "Data Bridge",
    description: "LIMS live sync and manual file import (admin)",
  },
};

/**
 * ENG-158 / ENG-187: tier-appropriate defaults for Console "Reset to defaults".
 * `subscriptionTier === null` is treated as free.
 */
export function getDefaultEnabledFlagsForTier(tier: string | null | undefined): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const name of KANTA_FEATURE_FLAG_NAMES) {
    out[name] = false;
  }

  const idx = tierOrderIndex(tier);
  if (idx < 0) return out;

  if (idx >= TIER_ORDER.indexOf("starter")) {
    out["show-refrigerator-module"] = true;
    out["show-sample-scan"] = true;
  }

  if (idx >= TIER_ORDER.indexOf("pro")) {
    const proOn: KantaFeatureFlagName[] = [
      "show-ai-intelligence",
      "show-lrids",
      "show-reception-tab",
      "show-tat-test-level",
      "show-qc-module",
    ];
    for (const key of proOn) {
      out[key] = true;
    }
  }

  if (idx >= TIER_ORDER.indexOf("enterprise")) {
    out["show-data-bridge"] = true;
  }

  return out;
}
