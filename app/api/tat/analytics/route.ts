/**
 * GET /api/tat/analytics — Nakasero-style TAT dashboard data.
 * Returns: pieData, dailyTrend, hourlyTrend, kpis (matches zyntel-dashboard /api/tat)
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");
  const period = searchParams.get("period") ?? "thisMonth";

  if (!facilityId) {
    return NextResponse.json(
      { error: "facility_id is required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({
      pieData: { onTime: 0, delayedLess15: 0, overDelayed: 0, notUploaded: 0 },
      granularity: "daily",
      dailyTrend: [],
      hourlyTrend: Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        delayed: 0,
        onTime: 0,
        notUploaded: 0,
      })),
      kpis: {
        totalRequests: 0,
        delayedRequests: 0,
        onTimeRequests: 0,
        avgDailyDelayed: 0,
        avgDailyOnTime: 0,
        avgDailyNotUploaded: 0,
        mostDelayedHour: "N/A",
        mostDelayedDay: "N/A",
      },
    });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { start, end } = getPeriodDates(period);
    const startStr = start.toISOString().slice(0, 10);
    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() + 1);
    const endStr = endDate.toISOString().slice(0, 10);

    const granularity =
      period === "lastMonth" || period === "thisMonth" ? "monthly" : "daily";

    const { data: requests } = await db
      .from("test_requests")
      .select("id, requested_at, received_at, resulted_at, status, section, test_name")
      .eq("facility_id", facilityId)
      .neq("status", "cancelled")
      .gte("requested_at", startStr)
      .lt("requested_at", endStr);

    const { data: targets } = await db
      .from("tat_targets")
      .select("section, test_name, target_minutes")
      .eq("facility_id", facilityId);

    const targetMap = new Map<string, number>();
    for (const t of targets ?? []) {
      const key = t.test_name ? `${t.section}:${t.test_name}` : t.section;
      targetMap.set(key, t.target_minutes);
    }

    let onTime = 0,
      delayedLess15 = 0,
      overDelayed = 0,
      notUploaded = 0;

    const byDate: Record<
      string,
      { delayed: number; onTime: number; notUploaded: number }
    > = {};
    const byMonth: Record<
      string,
      { delayed: number; onTime: number; notUploaded: number }
    > = {};
    const byHour: Record<
      number,
      { delayed: number; onTime: number; notUploaded: number }
    > = {};
    for (let h = 0; h < 24; h++) byHour[h] = { delayed: 0, onTime: 0, notUploaded: 0 };

    for (const r of requests ?? []) {
      const target =
        targetMap.get(`${r.section}:${r.test_name}`) ??
        targetMap.get(r.section) ??
        60;

      if (r.status !== "resulted" || !r.resulted_at) {
        notUploaded++;
        const d = (r.requested_at ?? r.received_at)?.toString().slice(0, 10) ?? "";
        const m = d ? d.slice(0, 7) : "";
        const hour = r.requested_at
          ? new Date(r.requested_at).getHours()
          : new Date().getHours();
        if (d) {
          if (!byDate[d]) byDate[d] = { delayed: 0, onTime: 0, notUploaded: 0 };
          byDate[d].notUploaded++;
        }
        if (m) {
          if (!byMonth[m]) byMonth[m] = { delayed: 0, onTime: 0, notUploaded: 0 };
          byMonth[m].notUploaded++;
        }
        byHour[hour].notUploaded++;
        continue;
      }

      const received = r.received_at ? new Date(r.received_at) : new Date(r.requested_at);
      const resulted = new Date(r.resulted_at);
      const tat = Math.floor((resulted.getTime() - received.getTime()) / 60000);
      const breach = tat - target;

      const d = received.toISOString().slice(0, 10);
      const m = d.slice(0, 7);
      const hour = received.getHours();

      if (!byDate[d]) byDate[d] = { delayed: 0, onTime: 0, notUploaded: 0 };
      if (!byMonth[m]) byMonth[m] = { delayed: 0, onTime: 0, notUploaded: 0 };

      if (breach <= 0) {
        onTime++;
        byDate[d].onTime++;
        byMonth[m].onTime++;
        byHour[hour].onTime++;
      } else if (breach <= 15) {
        delayedLess15++;
        byDate[d].delayed++;
        byMonth[m].delayed++;
        byHour[hour].delayed++;
      } else {
        overDelayed++;
        byDate[d].delayed++;
        byMonth[m].delayed++;
        byHour[hour].delayed++;
      }
    }

    const delayedTotal = delayedLess15 + overDelayed;
    const totalRequests = onTime + delayedTotal + notUploaded;
    const daysInPeriod = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );

    const dailyTrend = (
      granularity === "monthly" ? Object.entries(byMonth) : Object.entries(byDate)
    )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        delayed: v.delayed,
        onTime: v.onTime,
        notUploaded: v.notUploaded,
      }));

    const hourlyTrend = Object.entries(byHour)
      .map(([h, v]) => ({
        hour: parseInt(h, 10),
        delayed: v.delayed,
        onTime: v.onTime,
        notUploaded: v.notUploaded,
      }))
      .sort((a, b) => a.hour - b.hour);

    const mostDelayedHourEntry = hourlyTrend.reduce(
      (max, row) => (row.delayed > max.delayed ? row : max),
      { hour: 0, delayed: 0 }
    );
    const sourceForDay = granularity === "monthly" ? byMonth : byDate;
    const mostDelayedDayEntry = Object.entries(sourceForDay).reduce(
      (max, [date, v]) => (v.delayed > max.delayed ? { date, ...v } : max),
      { date: "", delayed: 0 }
    );

    return NextResponse.json({
      pieData: {
        onTime,
        delayedLess15,
        overDelayed,
        notUploaded,
      },
      granularity,
      dailyTrend,
      hourlyTrend,
      kpis: {
        totalRequests,
        delayedRequests: delayedTotal,
        onTimeRequests: onTime,
        avgDailyDelayed: (delayedTotal / daysInPeriod).toFixed(1),
        avgDailyOnTime: (onTime / daysInPeriod).toFixed(1),
        avgDailyNotUploaded: (notUploaded / daysInPeriod).toFixed(1),
        mostDelayedHour:
          mostDelayedHourEntry.delayed > 0
            ? `${mostDelayedHourEntry.hour}:00 - ${mostDelayedHourEntry.hour + 1}:00`
            : "N/A",
        mostDelayedDay:
          mostDelayedDayEntry.delayed > 0
            ? new Date(mostDelayedDayEntry.date).toLocaleDateString()
            : "N/A",
      },
    });
  } catch (err) {
    console.error("[GET /api/tat/analytics]", err);
    return NextResponse.json(
      { error: "Failed to fetch TAT analytics" },
      { status: 500 }
    );
  }
}
