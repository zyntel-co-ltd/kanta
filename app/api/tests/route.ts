/**
 * GET /api/tests — Tests module: volume vs target, trend, top tests.
 * Aggregates from test_requests (excludes cancelled).
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

function getPeriodDates(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "thisWeek":
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case "thisMonth":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "lastMonth":
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");
  const period = searchParams.get("period") ?? "thisMonth";
  const section = searchParams.get("section") ?? "all";

  if (!facilityId) {
    return NextResponse.json(
      { error: "facility_id is required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({
      totalTestsPerformed: 0,
      targetTestsPerformed: 0,
      percentage: 0,
      avgDailyTests: 0,
      testVolumeTrend: [],
      topTestsBySection: [],
    });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { start, end } = getPeriodDates(period);
    const startStr = toDateStr(start);
    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() + 1);
    const endExclusive = toDateStr(endDate);

    // Build filter (endExclusive so we include full end day)
    let query = db
      .from("test_requests")
      .select("id, test_name, section, requested_at, status")
      .eq("facility_id", facilityId)
      .neq("status", "cancelled")
      .gte("requested_at", startStr)
      .lt("requested_at", endExclusive);

    if (section && section !== "all") {
      query = query.eq("section", section);
    }

    const { data: requests, error } = await query;

    if (error) throw error;

    const totalTestsPerformed = requests?.length ?? 0;

    // Get target for period (monthly)
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const { data: targetRow } = await db
      .from("tests_targets")
      .select("target")
      .eq("facility_id", facilityId)
      .eq("period", "monthly")
      .eq("period_start", monthStart)
      .single();

    const targetTestsPerformed = targetRow?.target ?? 0;
    const percentage =
      targetTestsPerformed > 0
        ? Math.round((totalTestsPerformed / targetTestsPerformed) * 100)
        : 0;

    const daysInPeriod = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    const avgDailyTests = totalTestsPerformed / daysInPeriod;

    // Volume trend by date
    const byDate: Record<string, number> = {};
    (requests ?? []).forEach((r) => {
      const d = r.requested_at?.toString().slice(0, 10) ?? "";
      if (d) byDate[d] = (byDate[d] ?? 0) + 1;
    });
    const testVolumeTrend = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Top tests by section
    const bySection: Record<string, Record<string, number>> = {};
    (requests ?? []).forEach((r) => {
      const sec = r.section ?? "Other";
      if (!bySection[sec]) bySection[sec] = {};
      const name = r.test_name ?? "Unknown";
      bySection[sec][name] = (bySection[sec][name] ?? 0) + 1;
    });

    const topTestsBySection: { section: string; tests: { test: string; count: number }[] }[] =
      Object.entries(bySection).map(([sec, tests]) => ({
        section: sec,
        tests: Object.entries(tests)
          .map(([test, count]) => ({ test, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20),
      }));

    return NextResponse.json({
      totalTestsPerformed,
      targetTestsPerformed,
      percentage,
      avgDailyTests,
      testVolumeTrend,
      topTestsBySection,
    });
  } catch (err) {
    console.error("[GET /api/tests]", err);
    return NextResponse.json(
      { error: "Failed to fetch tests data" },
      { status: 500 }
    );
  }
}
