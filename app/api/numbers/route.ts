/**
 * GET /api/numbers — Patient-level (requests) and test-level volume.
 * Like zyntel-dashboard Numbers page: requests = lab numbers, tests = individual tests.
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
  const shift = searchParams.get("shift");
  const section = searchParams.get("section") ?? "all";

  if (!facilityId) {
    return NextResponse.json(
      { error: "facility_id is required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({
      totalRequests: 0,
      targetRequests: 0,
      requestsPercentage: 0,
      totalTests: 0,
      targetTests: 0,
      testsPercentage: 0,
      avgDailyRequests: 0,
      avgDailyTests: 0,
      busiestHour: null,
      busiestDay: null,
      dailyRequestVolume: [],
      dailyTestVolume: [],
      hourlyRequestVolume: [],
      granularity: "daily",
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

    let query = db
      .from("test_requests")
      .select("id, lab_number, requested_at, section, shift")
      .eq("facility_id", facilityId)
      .neq("status", "cancelled")
      .gte("requested_at", startStr)
      .lt("requested_at", endExclusive);

    if (shift && shift !== "all") {
      query = query.eq("shift", shift);
    }
    if (section && section !== "all") {
      query = query.eq("section", section);
    }

    const { data: rows, error } = await query;

    if (error) throw error;

    const items = rows ?? [];

    // Patient/request level: distinct lab_numbers
    const uniqueLabNos = new Set<string>();
    items.forEach((r) => {
      if (r.lab_number?.trim()) uniqueLabNos.add(r.lab_number.trim());
    });
    const totalRequests = uniqueLabNos.size;

    // Test level: all rows
    const totalTests = items.length;

    // Targets
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const [reqTargetRes, testTargetRes] = await Promise.all([
      db
        .from("numbers_targets")
        .select("target")
        .eq("facility_id", facilityId)
        .eq("period", "monthly")
        .eq("period_start", monthStart)
        .single(),
      db
        .from("tests_targets")
        .select("target")
        .eq("facility_id", facilityId)
        .eq("period", "monthly")
        .eq("period_start", monthStart)
        .single(),
    ]);

    const targetRequests = reqTargetRes.data?.target ?? 0;
    const targetTests = testTargetRes.data?.target ?? 0;
    const requestsPercentage =
      targetRequests > 0 ? (totalRequests / targetRequests) * 100 : 0;
    const testsPercentage =
      targetTests > 0 ? (totalTests / targetTests) * 100 : 0;

    const daysInPeriod = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    const avgDailyRequests = totalRequests / daysInPeriod;
    const avgDailyTests = totalTests / daysInPeriod;

    // Daily volume (requests = distinct lab_nos per date)
    const requestsByDate: Record<string, Set<string>> = {};
    const testsByDate: Record<string, number> = {};
    items.forEach((r) => {
      const d = r.requested_at?.toString().slice(0, 10) ?? "";
      if (d) {
        if (!requestsByDate[d]) requestsByDate[d] = new Set();
        if (r.lab_number?.trim()) requestsByDate[d].add(r.lab_number.trim());
        testsByDate[d] = (testsByDate[d] ?? 0) + 1;
      }
    });

    const dailyRequestVolume = Object.entries(requestsByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, set]) => ({ date, count: set.size }));

    const dailyTestVolume = Object.entries(testsByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Hourly volume (requests - need hour from requested_at)
    const hourlyByHour: Record<number, Set<string>> = {};
    for (let h = 0; h < 24; h++) hourlyByHour[h] = new Set();
    items.forEach((r) => {
      const dt = r.requested_at ? new Date(r.requested_at) : null;
      if (dt && r.lab_number?.trim()) {
        const h = dt.getHours();
        hourlyByHour[h].add(r.lab_number.trim());
      }
    });

    const hourlyRequestVolume = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourlyByHour[hour]?.size ?? 0,
    }));

    const busiestHourIdx = hourlyRequestVolume.reduce(
      (best, cur, i) => (cur.count > (hourlyRequestVolume[best]?.count ?? 0) ? i : best),
      0
    );
    const busiestDayEntry = dailyRequestVolume.reduce(
      (best, cur) =>
        cur.count > (best?.count ?? 0) ? cur : best,
      null as { date: string; count: number } | null
    );

    const granularity =
      period === "lastMonth" || period === "thisMonth" ? "monthly" : "daily";

    return NextResponse.json({
      totalRequests,
      targetRequests,
      requestsPercentage,
      totalTests,
      targetTests,
      testsPercentage,
      avgDailyRequests,
      avgDailyTests,
      busiestHour:
        hourlyRequestVolume[busiestHourIdx]?.count > 0
          ? `${busiestHourIdx}:00 - ${busiestHourIdx + 1}:00`
          : null,
      busiestDay: busiestDayEntry
        ? `${new Date(busiestDayEntry.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })} (${busiestDayEntry.count} requests)`
        : null,
      dailyRequestVolume,
      dailyTestVolume,
      hourlyRequestVolume,
      granularity,
    });
  } catch (err) {
    console.error("[GET /api/numbers]", err);
    return NextResponse.json(
      { error: "Failed to fetch numbers data" },
      { status: 500 }
    );
  }
}
