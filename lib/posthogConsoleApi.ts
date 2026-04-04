// LEGACY — flag management migrated to facility_flags (Supabase). Retained for PostHog analytics only.
/**
 * PostHog REST API helpers (legacy ENG-158).
 *
 * ENG-161 / ENG-188: Feature flags are stored in `facility_flags` — this module is not used for flag toggles.
 * Kept for reference if Group Analytics is purchased later.
 */

import {
  KANTA_FEATURE_FLAG_NAMES,
  getDefaultEnabledFlagsForTier,
} from "@/lib/featureFlagCatalog";

export function posthogManagementConfigured(): boolean {
  return !!(
    process.env.POSTHOG_PERSONAL_API_KEY?.trim() &&
    process.env.POSTHOG_PROJECT_ID?.trim()
  );
}

export function getPosthogApiBase(): string {
  const raw =
    process.env.POSTHOG_API_HOST?.trim() ||
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ||
    "https://us.posthog.com";
  return raw.replace(/\/$/, "");
}

async function phFetch(path: string, init?: RequestInit): Promise<Response> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY?.trim();
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim();
  if (!key || !projectId) {
    throw new Error("POSTHOG_NOT_CONFIGURED");
  }
  const base = getPosthogApiBase();
  const url = `${base}/api/projects/${projectId}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

type PhProperty = {
  key?: string;
  value?: unknown;
  operator?: string;
  type?: string;
  group_type_index?: number;
};

type PhGroup = {
  properties?: PhProperty[];
  rollout_percentage?: number | null;
};

/**
 * Index of the `branch` group type in PostHog → Data Management → Group types (0 = first).
 * Override with `POSTHOG_BRANCH_GROUP_TYPE_INDEX` if `branch` is not first.
 */
function branchGroupTypeIndex(): number {
  const raw = process.env.POSTHOG_BRANCH_GROUP_TYPE_INDEX?.trim();
  if (raw === undefined || raw === "") return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

type PhFlag = {
  id: number;
  key: string;
  filters?: {
    /** Required for group-based flags; without it PostHog treats filters as person-aggregated. */
    aggregation_group_type_index?: number;
    groups?: PhGroup[];
  };
};

function groupTargetsFacilityGroup(group: PhGroup, facilityId: string): boolean {
  const props = group.properties ?? [];
  for (const p of props) {
    if (p.key !== "$group_key") continue;
    if (typeof p.value === "string" && p.value === facilityId) return true;
  }
  return false;
}

export function isFlagEnabledForFacility(
  flag: PhFlag,
  facilityId: string
): boolean {
  const groups = flag.filters?.groups ?? [];
  return groups.some((g) => groupTargetsFacilityGroup(g, facilityId));
}

function makeFacilityGroup(facilityId: string): PhGroup {
  const idx = branchGroupTypeIndex();
  return {
    properties: [
      {
        key: "$group_key",
        value: facilityId,
        operator: "exact",
        type: "group",
        group_type_index: idx,
      },
    ],
    rollout_percentage: 100,
  };
}

function mergeGroupsForToggle(
  existing: PhGroup[],
  facilityId: string,
  enabled: boolean
): PhGroup[] {
  const rest = existing.filter((g) => !groupTargetsFacilityGroup(g, facilityId));
  if (!enabled) return rest;
  return [...rest, makeFacilityGroup(facilityId)];
}

export async function listProjectFeatureFlags(): Promise<PhFlag[]> {
  const res = await phFetch("/feature_flags/?limit=1000");
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PostHog list flags failed (${res.status}): ${t.slice(0, 500)}`);
  }
  const data = (await res.json()) as { results?: PhFlag[] } | PhFlag[];
  if (Array.isArray(data)) return data;
  return data.results ?? [];
}

export async function getFlagByKey(key: string): Promise<PhFlag | null> {
  const all = await listProjectFeatureFlags();
  return all.find((f) => f.key === key) ?? null;
}

export async function patchFlagGroups(flagId: number, groups: PhGroup[]): Promise<void> {
  const idx = branchGroupTypeIndex();
  const res = await phFetch(`/feature_flags/${flagId}/`, {
    method: "PATCH",
    body: JSON.stringify({
      filters: {
        aggregation_group_type_index: idx,
        groups,
      },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PostHog update flag failed (${res.status}): ${t.slice(0, 500)}`);
  }
}

export async function setFacilityFlagOverride(
  flagKey: string,
  facilityId: string,
  enabled: boolean
): Promise<void> {
  const flag = await getFlagByKey(flagKey);
  if (!flag) {
    throw new Error(`Unknown PostHog flag key: ${flagKey}`);
  }
  const current = flag.filters?.groups ?? [];
  const next = mergeGroupsForToggle(current, facilityId, enabled);
  await patchFlagGroups(flag.id, next);
}

export async function resetFacilityFlagsToTierDefaults(
  facilityId: string,
  hospitalTier: string | null
): Promise<void> {
  const defaults = getDefaultEnabledFlagsForTier(hospitalTier);
  const flags = await listProjectFeatureFlags();
  const byKey = new Map(flags.map((f) => [f.key, f]));

  for (const name of KANTA_FEATURE_FLAG_NAMES) {
    const flag = byKey.get(name);
    if (!flag) continue;
    const want = defaults[name] ?? false;
    const current = flag.filters?.groups ?? [];
    const next = mergeGroupsForToggle(current, facilityId, want);
    await patchFlagGroups(flag.id, next);
  }
}

export async function buildFlagStateForFacility(
  facilityId: string
): Promise<Record<string, boolean>> {
  const flags = await listProjectFeatureFlags();
  const byKey = new Map(flags.map((f) => [f.key, f]));
  const out: Record<string, boolean> = {};
  for (const name of KANTA_FEATURE_FLAG_NAMES) {
    const f = byKey.get(name);
    out[name] = f ? isFlagEnabledForFacility(f, facilityId) : false;
  }
  return out;
}
