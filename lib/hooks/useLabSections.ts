"use client";

import { useCallback, useMemo } from "react";
import {
  useLabConfigData,
  type FilterOption,
  type LabSectionRow,
} from "@/lib/hooks/useFacilityConfig";

/**
 * ENG-109: lab sections only — shares SWR cache with `useFacilityConfig` (same facility key).
 */
export function useLabSections(facilityId: string | null | undefined) {
  const { data, error, isLoading, mutate } = useLabConfigData(facilityId);

  const sections = data?.sections ?? [];

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

  return {
    loading: isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    sections: sections as LabSectionRow[],
    activeSections,
    sectionFilterOptions,
    resolveSectionLabel,
    hasConfiguredSections: activeSections.length > 0,
    mutate,
  };
}
