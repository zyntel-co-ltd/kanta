"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

/**
 * ENG-86: Single fetch of lab sections, shifts, and section-level TAT targets per facility.
 * Cached in state for the session; refetch only when `facilityId` changes.
 */
export function useFacilityConfig(facilityId: string | null | undefined) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<LabSectionRow[]>([]);
  const [shifts, setShifts] = useState<LabShiftRow[]>([]);
  const [tatTargets, setTatTargets] = useState<TatTargetRow[]>([]);

  useEffect(() => {
    if (!facilityId) {
      setSections([]);
      setShifts([]);
      setTatTargets([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
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
        if (cancelled) return;
        setSections(Array.isArray(j.sections) ? j.sections : []);
        setShifts(Array.isArray(j.shifts) ? j.shifts : []);
        setTatTargets(Array.isArray(j.tatTargets) ? j.tatTargets : []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load configuration");
          setSections([]);
          setShifts([]);
          setTatTargets([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [facilityId]);

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

  /** Section-level targets only (no per-test rows). */
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
    loading,
    error,
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
  };
}
