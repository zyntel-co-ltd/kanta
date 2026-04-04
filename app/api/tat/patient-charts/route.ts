/**
 * GET /api/tat/patient-charts — TAT performance distribution for pie/line/hourly charts.
 * Classifies each test_request as on-time, delayed<15, over-delayed, or not-uploaded.
 * Mirrors zyntel-dashboard TAT.tsx data shape exactly.
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

function getPeriodDates(
  period: string,
  startDate?: string | null,
  endDate?: string | null
): { start: Date; end: Date } {
  if (startDate && endDate) {
    return { start: new Date(startDate + "T00:00:00"), end: new Date(endDate + "T23:59:59") };
  }
  const end = new Date();
  const start = new Date();
  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "yesterday":
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "thisWeek":
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case "lastWeek":
      start.setDate(start.getDate() - 14);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 7);
      end.setHours(23, 59, 59, 999);
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
    case "thisQuarter":
      start.setMonth(Math.floor(start.getMonth() / 3) * 3);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "thisYear":
      start.setMonth(0);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

type TatCategory = "onTime" | "delayedLess15" | "overDelayed" | "notUploaded";

function classifyRow(
  timeInRaw: string | null,
  timeOutRaw: string | null,
  targetMinutes: number
): TatCategory {
  if (!timeInRaw) return "notUploaded";
  const timeIn = new Date(timeInRaw).getTime();
  if (Number.isNaN(timeIn)) return "notUploaded";
  if (!timeOutRaw) return "notUploaded"; // in-progress (not yet resulted)
  const timeOut = new Date(timeOutRaw).getTime();
  if (Number.isNaN(timeOut)) return "notUploaded";
  const elapsedMin = Math.max(0, Math.floor((timeOut - timeIn) / 60_000));
  const target = Math.max(1, Math.floor(targetMinutes));
  if (elapsedMin <= target) return "onTime";
  const breach = elapsedMin - target;
  if (breach <= 15) return "delayedLess15";
  return "overDelayed";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");
  const period = searchParams.get("period") ?? "thisMonth";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const shift = searchParams.get("shift");
  const laboratory = searchParams.get("laboratory");

  if (!facilityId) {
    return NextResponse.json({ error: "facility_id is required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({
      pieData: { onTime: 0, delayedLess15: 0, overDelayed: 0, notUploaded: 0 },
      dailyTrend: [],
      hourlyTrend: [],
      kpis: {
        totalRequests: 0,
        delayedRequests: 0,
        onTimeRequests: 0,
        avgDailyDelayed: 0,
        avgDailyOnTime: 0,
        avgDailyNotUploaded: 0,
        mostDelayedHour: "—",
        mostDelayedDay: "—",
      },
      granularity: "daily",
    });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();
    const { start, end } = getPeriodDates(period, startDate, endDate);
    const startStr = start.toISOString().slice(0, 10);
    const endExclusive = new Date(end.getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    let q = db
      .from("test_requests")
      .select(
        "id, lab_number, section, test_name, shift, requested_at, received_at, resulted_at, section_time_in, section_time_out"
      )
      .eq("facility_id", facilityId)
      .neq("status", "cancelled")
      .gte("requested_at", startStr)
      .lt("requested_at", endExclusive);

    if (shift && shift !== "all") q = q.eq("shift", shift);
    if (laboratory && laboratory !== "all") q = q.eq("laboratory", laboratory);

    const [{ data: rows, error }, { data: targets }] = await Promise.all([
      q,
      db
        .from("tat_targets")
        .select("section, test_name, target_minutes")
        .eq("facility_id", facilityId),
    ]);
    if (error) throw error;

    const targetMap = new Map<string, number>();
    for (const t of targets ?? []) {
      const key = t.test_name ? `${t.section}:${t.test_name}` : t.section;
      targetMap.set(key, t.target_minutes);
    }

    const pieData = { onTime: 0, delayedLess15: 0, overDelayed: 0, notUploaded: 0 };
    const byDate: Record<string, { onTime: number; delayed: number; notUploaded: number }> = {};
    const byHour: Record<number, { onTime: number; delayed: number; notUploaded: number }> = {};
    for (let h = 0; h < 24; h++) byHour[h] = { onTime: 0, delayed: 0, notUploaded: 0 };

    for (const r of rows ?? []) {
      const target =
        targetMap.get(`${r.section}:${r.test_name}`) ??
        targetMap.get(r.section) ??
        60;
      const timeIn = r.section_time_in ?? r.received_at;
      const timeOut = r.section_time_out ?? r.resulted_at;
      const cat = classifyRow(timeIn, timeOut, target);
      pieData[cat] += 1;

      const d = (r.requested_at as string | null)?.slice(0, 10) ?? "";
      if (d) {
        if (!byDate[d]) byDate[d] = { onTime: 0, delayed: 0, notUploaded: 0 };
        if (cat === "onTime") byDate[d].onTime += 1;
        else if (cat === "notUploaded") byDate[d].notUploaded += 1;
        else byDate[d].delayed += 1;
      }

      const reqAt = r.requested_at ? new Date(r.requested_at as string) : null;
      if (reqAt && !Number.isNaN(reqAt.getTime())) {
        const h = reqAt.getHours();
        if (cat === "onTime") byHour[h].onTime += 1;
        else if (cat === "notUploaded") byHour[h].notUploaded += 1;
        else byHour[h].delayed += 1;
      }
    }

    const dailyTrend = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, onTime: v.onTime, delayed: v.delayed, notUploaded: v.notUploaded }));

    const hourlyTrend = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      onTime: byHour[h].onTime,
      delayed: byHour[h].delayed,
      notUploaded: byHour[h].notUploaded,
    }));

    const totalRequests = (rows ?? []).length;
    const delayedRequests = pieData.delayedLess15 + pieData.overDelayed;
    const onTimeRequests = pieData.onTime;
    const dayCount = Math.max(1, dailyTrend.length);
    const avgDailyDelayed = delayedRequests / dayCount;
    const avgDailyOnTime = onTimeRequests / dayCount;
    const avgDailyNotUploaded = pieData.notUploaded / dayCount;

    const mostDelayedHourEntry = hourlyTrend.reduce(
      (best, cur) => (cur.delayed > best.delayed ? cur : best),
      hourlyTrend[0]
    );
    const mostDelayedDayEntry = dailyTrend.reduce(
      (best: { date: string; delayed: number } | null, cur) =>
        cur.delayed > (best?.delayed ?? -1) ? cur : best,
      null
    );

    const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const mostDelayedDay = mostDelayedDayEntry
      ? DAY_NAMES[new Date(mostDelayedDayEntry.date).getDay()] ?? mostDelayedDayEntry.date
      : "—";

    const daySpan = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const granularity: "daily" | "monthly" = daySpan > 62 ? "monthly" : "daily";

    return NextResponse.json({
      pieData,
      dailyTrend,
      hourlyTrend,
      kpis: {
        totalRequests,
        delayedRequests,
        onTimeRequests,
        avgDailyDelayed: Math.round(avgDailyDelayed * 10) / 10,
        avgDailyOnTime: Math.round(avgDailyOnTime * 10) / 10,
        avgDailyNotUploaded: Math.round(avgDailyNotUploaded * 10) / 10,
        mostDelayedHour:
          (mostDelayedHourEntry?.delayed ?? 0) > 0
            ? `${mostDelayedHourEntry.hour}:00 – ${mostDelayedHourEntry.hour + 1}:00`
            : "—",
        mostDelayedDay,
      },
      granularity,
    });
  } catch (err) {
    console.error("[GET /api/tat/patient-charts]", err);
    return NextResponse.json({ error: "Failed to compute TAT chart data" }, { status: 500 });
  }
}
