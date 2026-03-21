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

      const hour = received.getHours();
      if (!heatmapData[r.section]) heatmapData[r.section] = {};
      if (!heatmapData[r.section][hour]) heatmapData[r.section][hour] = [];
      heatmapData[r.section][hour].push(tat);
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
