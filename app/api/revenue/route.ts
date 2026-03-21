/**
 * GET /api/revenue — revenue analytics (admin/manager only)
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id") ?? "6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5";
  const period = searchParams.get("period") ?? "thisMonth";

  if (!supabaseConfigured) {
    return NextResponse.json({
      data: {
        today: 0,
        yesterday: 0,
        sameDayLastWeek: 0,
        dailyRevenue: [],
        sectionRevenue: [],
        testRevenue: [],
        cancellationRate: 0,
        pendingCount: 0,
        cancelledCount: 0,
      },
      error: null,
    });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekStr = lastWeek.toISOString().slice(0, 10);

    const start = new Date(now);
    if (period === "thisMonth") {
      start.setDate(1);
    } else if (period === "lastMonth") {
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
    }
    const startStr = start.toISOString().slice(0, 10);

    const { data: entries } = await db
      .from("revenue_entries")
      .select("date, amount, section, test_name, status")
      .eq("facility_id", facilityId)
      .gte("date", startStr);

    const today = (entries ?? [])
      .filter((e) => e.date === todayStr && e.status === "completed")
      .reduce((s, e) => s + Number(e.amount), 0);
    const yesterdayTotal = (entries ?? [])
      .filter((e) => e.date === yesterdayStr && e.status === "completed")
      .reduce((s, e) => s + Number(e.amount), 0);
    const sameDayLastWeek = (entries ?? [])
      .filter((e) => e.date === lastWeekStr && e.status === "completed")
      .reduce((s, e) => s + Number(e.amount), 0);

    const byDate: Record<string, number> = {};
    for (const e of entries ?? []) {
      if (e.status !== "completed") continue;
      byDate[e.date] = (byDate[e.date] ?? 0) + Number(e.amount);
    }
    const dailyRevenue = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));

    const bySection: Record<string, number> = {};
    for (const e of entries ?? []) {
      if (e.status !== "completed") continue;
      bySection[e.section] = (bySection[e.section] ?? 0) + Number(e.amount);
    }
    const sectionRevenue = Object.entries(bySection).map(([section, revenue]) => ({
      section,
      revenue,
    }));

    const byTest: Record<string, number> = {};
    for (const e of entries ?? []) {
      if (e.status !== "completed") continue;
      byTest[e.test_name] = (byTest[e.test_name] ?? 0) + Number(e.amount);
    }
    const testRevenue = Object.entries(byTest)
      .map(([test_name, revenue]) => ({ test_name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 50);

    const total = (entries ?? []).filter((e) => e.status === "completed").length;
    const cancelled = (entries ?? []).filter((e) => e.status === "cancelled").length;
    const pending = (entries ?? []).filter((e) => e.status === "pending").length;
    const cancellationRate = total + cancelled > 0 ? (cancelled / (total + cancelled)) * 100 : 0;

    return NextResponse.json({
      data: {
        today,
        yesterday: yesterdayTotal,
        sameDayLastWeek,
        dailyRevenue,
        sectionRevenue,
        testRevenue,
        cancellationRate,
        pendingCount: pending,
        cancelledCount: cancelled,
      },
      error: null,
    });
  } catch (err) {
    console.error("[GET /api/revenue]", err);
    return NextResponse.json(
      { data: null, error: "Failed to fetch revenue" },
      { status: 500 }
    );
  }
}
