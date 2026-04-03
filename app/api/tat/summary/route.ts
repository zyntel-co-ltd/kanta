/**
 * GET /api/tat/summary — per-section TAT summary + heatmap data
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");
  const days = parseInt(searchParams.get("days") ?? "7", 10);

  if (!facilityId) {
    return NextResponse.json(
      { data: null, error: "facility_id is required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({
      data: {
        sections: [],
        heatmap: [],
        sparklines: {},
      },
      error: null,
    });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data: requests } = await db
      .from("test_requests")
      .select("id, section, test_name, received_at, resulted_at, status")
      .eq("facility_id", facilityId)
      .gte("received_at", since.toISOString());

    const { data: targets } = await db
      .from("tat_targets")
      .select("section, test_name, target_minutes")
      .eq("facility_id", facilityId);

    const targetMap = new Map<string, number>();
    for (const t of targets ?? []) {
      const key = t.test_name ? `${t.section}:${t.test_name}` : t.section;
      targetMap.set(key, t.target_minutes);
    }

    const sectionStats: Record<string, { avg: number; count: number; target: number }> = {};
    const heatmapData: Record<string, Record<number, number[]>> = {};
    /** Dedup raw rows vs daily_metrics (purge aggregates) per ENG-99. */
    const coveredDayKeys = new Set<string>();

    for (const r of requests ?? []) {
      if (!r.received_at || !r.resulted_at) continue;
      const received = new Date(r.received_at);
      const resulted = new Date(r.resulted_at);
      const tat = Math.floor((resulted.getTime() - received.getTime()) / 60000);
      const target = targetMap.get(`${r.section}:${r.test_name}`) ?? targetMap.get(r.section) ?? 60;

      if (!sectionStats[r.section]) {
        sectionStats[r.section] = { avg: 0, count: 0, target };
      }
      sectionStats[r.section].avg += tat;
      sectionStats[r.section].count += 1;

      const d = received.toISOString().slice(0, 10);
      coveredDayKeys.add(`${d}|${r.section}|${String(r.test_name ?? "")}`);

      const hour = received.getHours();
      if (!heatmapData[r.section]) heatmapData[r.section] = {};
      if (!heatmapData[r.section][hour]) heatmapData[r.section][hour] = [];
      heatmapData[r.section][hour].push(tat);
    }

    const sinceDay = since.toISOString().slice(0, 10);
    const { data: dailyRows } = await db
      .from("daily_metrics")
      .select("test_date, section, test_name, request_count, avg_tat_minutes")
      .eq("facility_id", facilityId)
      .gte("test_date", sinceDay);

    for (const m of dailyRows ?? []) {
      const d = String(m.test_date);
      const section = String(m.section ?? "");
      const testName = String(m.test_name ?? "");
      const k = `${d}|${section}|${testName}`;
      if (coveredDayKeys.has(k)) continue;

      const cnt = Math.max(0, Math.floor(Number(m.request_count ?? 0)));
      const avgMin =
        m.avg_tat_minutes != null && !Number.isNaN(Number(m.avg_tat_minutes))
          ? Number(m.avg_tat_minutes)
          : null;
      if (cnt <= 0 || avgMin == null) continue;

      const target =
        targetMap.get(`${section}:${testName}`) ?? targetMap.get(section) ?? 60;
      if (!sectionStats[section]) {
        sectionStats[section] = { avg: 0, count: 0, target };
      }
      sectionStats[section].avg += avgMin * cnt;
      sectionStats[section].count += cnt;
    }

    const sections = Object.entries(sectionStats).map(([section, s]) => ({
      section,
      avg_tat: s.count > 0 ? Math.round(s.avg / s.count) : 0,
      count: s.count,
      target: s.target,
      on_target: s.count > 0 && (s.avg / s.count) <= s.target,
    }));

    const heatmap = Object.entries(heatmapData).map(([section, hours]) => ({
      section,
      by_hour: Object.entries(hours).map(([h, vals]) => ({
        hour: parseInt(h, 10),
        avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
        count: vals.length,
      })),
    }));

    const sparklines: Record<string, number[]> = {};
    const dayBuckets: Record<string, Record<string, number[]>> = {};
    for (const r of requests ?? []) {
      if (!r.received_at || !r.resulted_at) continue;
      const received = new Date(r.received_at);
      const resulted = new Date(r.resulted_at);
      const tat = Math.floor((resulted.getTime() - received.getTime()) / 60000);
      const d = received.toISOString().slice(0, 10);
      if (!dayBuckets[r.section]) dayBuckets[r.section] = {};
      if (!dayBuckets[r.section][d]) dayBuckets[r.section][d] = [];
      dayBuckets[r.section][d].push(tat);
    }
    for (const m of dailyRows ?? []) {
      const d = String(m.test_date);
      const section = String(m.section ?? "");
      const testName = String(m.test_name ?? "");
      if (coveredDayKeys.has(`${d}|${section}|${testName}`)) continue;
      const cnt = Math.max(0, Math.floor(Number(m.request_count ?? 0)));
      const avgMin =
        m.avg_tat_minutes != null && !Number.isNaN(Number(m.avg_tat_minutes))
          ? Number(m.avg_tat_minutes)
          : null;
      if (cnt <= 0 || avgMin == null) continue;
      const rounded = Math.round(avgMin);
      if (!dayBuckets[section]) dayBuckets[section] = {};
      if (!dayBuckets[section][d]) dayBuckets[section][d] = [];
      for (let i = 0; i < cnt; i++) {
        dayBuckets[section][d].push(rounded);
      }
    }
    for (const [section, days] of Object.entries(dayBuckets)) {
      const sorted = Object.entries(days).sort(([a], [b]) => a.localeCompare(b));
      sparklines[section] = sorted.map(([, vals]) =>
        Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      );
    }

    return NextResponse.json({
      data: { sections, heatmap, sparklines },
      error: null,
    });
  } catch (err) {
    console.error("[GET /api/tat/summary]", err);
    return NextResponse.json(
      { data: null, error: "Failed to fetch TAT summary" },
      { status: 500 }
    );
  }
}
