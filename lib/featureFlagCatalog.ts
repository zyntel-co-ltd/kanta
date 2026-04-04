/**
 * Server-safe catalog: flag keys, labels, tier defaults (ENG-158).
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
] as const;

export type KantaFeatureFlagName = (typeof KANTA_FEATURE_FLAG_NAMES)[number];

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
};

/** Tier values stored on `hospitals.tier` (see Console provisioning). */
function normalizeTierKey(tier: string | null | undefined): "free" | "pro" | "enterprise" | "other" {
  const t = (tier ?? "free").toLowerCase();
  if (t === "free" || t === "starter") return "free";
  if (t === "pro" || t === "professional") return "pro";
  if (t === "enterprise") return "enterprise";
  return "other";
}

/**
 * ENG-158: tier-appropriate defaults for Console "Reset to defaults".
 * `free`: all off. `professional` / `enterprise`: listed modules on (extend enterprise when needed).
 */
export function getDefaultEnabledFlagsForTier(
  tier: string | null | undefined
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const name of KANTA_FEATURE_FLAG_NAMES) {
    out[name] = false;
  }
  const k = normalizeTierKey(tier);
  if (k === "pro" || k === "enterprise") {
    const on: KantaFeatureFlagName[] = [
      "show-ai-intelligence",
      "show-lrids",
      "show-reception-tab",
      "show-refrigerator-module",
      "show-sample-scan",
      "show-tat-test-level",
    ];
    for (const key of on) {
      out[key] = true;
    }
  }
  return out;
}
