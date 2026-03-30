"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { REFERENCE_SWR_OPTIONS } from "@/lib/hooks/swrReferenceConfig";

export type TestCatalogFilters = {
  period: string;
  labSection: string;
  shift: string;
  hospitalUnit: string;
  testName: string;
  startDate: string;
  endDate: string;
};

export type TestCatalogData = {
  totalTestsPerformed: number;
  targetTestsPerformed: number;
  percentage: number;
  avgDailyTests: number;
  testVolumeTrend: { date: string; count: number }[];
  topTestsBySection: { section: string; tests: { test: string; count: number }[] }[];
  granularity?: "daily" | "monthly";
  error?: string;
};

async function fetchTestCatalog([, facilityId, f]: readonly [
  "tests",
  string,
  TestCatalogFilters,
]): Promise<TestCatalogData> {
  const params = new URLSearchParams({ facility_id: facilityId, period: f.period });
  if (f.labSection && f.labSection !== "all") params.append("section", f.labSection);
  if (f.shift && f.shift !== "all") params.append("shift", f.shift);
  if (f.hospitalUnit && f.hospitalUnit !== "all") params.append("laboratory", f.hospitalUnit);
  if (f.testName?.trim()) params.append("testName", f.testName.trim());
  if (f.startDate) params.append("startDate", f.startDate);
  if (f.endDate) params.append("endDate", f.endDate);

  const res = await fetch(`/api/tests?${params}`);
  if (!res.ok) throw new Error("Failed to load tests data");
  const json = (await res.json()) as TestCatalogData & { error?: string };
  if (json.error) throw new Error(json.error);
  return json;
}

/**
 * ENG-109: `/api/tests` with 5-minute SWR — volume, trends, top tests by section.
 */
export function useTestCatalog(facilityId: string, filters: TestCatalogFilters) {
  const key = useMemo(() => {
    if (!facilityId) return null;
    return ["tests", facilityId, filters] as const;
  }, [
    facilityId,
    filters.period,
    filters.labSection,
    filters.shift,
    filters.hospitalUnit,
    filters.testName,
    filters.startDate,
    filters.endDate,
  ]);

  return useSWR(key, fetchTestCatalog, REFERENCE_SWR_OPTIONS);
}
