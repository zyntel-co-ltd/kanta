"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { REFERENCE_SWR_OPTIONS } from "@/lib/hooks/swrReferenceConfig";

/** Default laboratory unit options (not facility-configured in ENG-85). */
const DEFAULT_LABORATORY_OPTIONS = [
  { value: "all", label: "All laboratories" },
  { value: "Main Laboratory", label: "Main Laboratory" },
  { value: "Annex", label: "Annex" },
];

export type LabSectionRow = {
  id: string;
  name: string;
  abbreviation: string;
  code: string;
  is_active?: boolean;
  sort_order?: number;
};

export type LabShiftRow = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active?: boolean;
};

export type TatTargetRow = {
  id?: string;
  section: string;
  section_id?: string | null;
  target_minutes: number;
  test_name?: string | null;
};

export type FilterOption = { value: string; label: string };

export type LabConfigPayload = {
  sections: LabSectionRow[];
  shifts: LabShiftRow[];
  tatTargets: TatTargetRow[];
};

async function fetchLabConfig([, facilityId]: readonly ["lab-config", string]): Promise<LabConfigPayload> {
  const res = await fetch(
    `/api/facility/lab-config?facility_id=${encodeURIComponent(facilityId)}`
  );
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(typeof j?.error === "string" ? j.error : "Failed to load lab configuration");
  }
  const j = (await res.json()) as {
    sections?: LabSectionRow[];
    shifts?: LabShiftRow[];
    tatTargets?: TatTargetRow[];
  };
  return {
    sections: Array.isArray(j.sections) ? j.sections : [],
    shifts: Array.isArray(j.shifts) ? j.shifts : [],
    tatTargets: Array.isArray(j.tatTargets) ? j.tatTargets : [],
  };
}

/** Shared SWR cache key for lab config — use with `useLabSections` in the same tree (deduped). */
export function useLabConfigData(facilityId: string | null | undefined) {
  const key = facilityId ? (["lab-config", facilityId] as const) : null;
  return useSWR(key, fetchLabConfig, REFERENCE_SWR_OPTIONS);
}

/**
 * ENG-86 / ENG-109: lab sections, shifts, TAT targets — SWR with 5-minute SWR window.
 */
export function useFacilityConfig(facilityId: string | null | undefined) {
  const { data, error, isLoading, mutate } = useLabConfigData(facilityId);

  const sections = data?.sections ?? [];
  const shifts = data?.shifts ?? [];
  const tatTargets = data?.tatTargets ?? [];

  const activeSections = useMemo(
    () =>
      sections
        .filter((s) => s.is_active !== false)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [sections]
  );

  const sectionFilterOptions: FilterOption[] = useMemo(
    () => [
      { value: "all", label: "All sections" },
      ...activeSections.map((s) => ({ value: s.code, label: s.name })),
    ],
    [activeSections]
  );

  const shiftFilterOptions: FilterOption[] = useMemo(() => {
    const active = shifts.filter((s) => s.is_active !== false);
    return [
      { value: "all", label: "All shifts" },
      ...active.map((s) => ({
        value: s.name,
        label: `${s.name} (${String(s.start_time).slice(0, 5)}–${String(s.end_time).slice(0, 5)})`,
      })),
    ];
  }, [shifts]);

  const laboratoryFilterOptions = DEFAULT_LABORATORY_OPTIONS;

  const targetMinutesBySectionCode = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tatTargets) {
      if (t.test_name != null && String(t.test_name).trim() !== "") continue;
      m.set(String(t.section).trim().toUpperCase(), t.target_minutes);
    }
    return m;
  }, [tatTargets]);

  const sectionNameByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of activeSections) {
      m.set(s.code.trim().toUpperCase(), s.name);
    }
    return m;
  }, [activeSections]);

  const resolveSectionLabel = useCallback(
    (codeOrRaw: string) => sectionNameByCode.get(codeOrRaw.trim().toUpperCase()) ?? codeOrRaw,
    [sectionNameByCode]
  );

  const hasConfiguredSections = activeSections.length > 0;

  return {
    loading: isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    sections,
    activeSections,
    shifts,
    tatTargets,
    sectionFilterOptions,
    shiftFilterOptions,
    laboratoryFilterOptions,
    targetMinutesBySectionCode,
    resolveSectionLabel,
    hasConfiguredSections,
    mutate,
  };
}
