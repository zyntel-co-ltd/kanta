/**
 * GET /api/performance — Performance metrics (throughput, TAT compliance)
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");
  const period = searchParams.get("period") ?? "today";

  if (!facilityId) {
    return NextResponse.json(
      { error: "facility_id required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({
      data: {
        totalResulted: 0,
        totalReceived: 0,
        avgTatMinutes: 0,
        breachCount: 0,
        bySection: [],
      },
    });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const now = new Date();
    let start: Date;
    if (period === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === "thisWeek") {
      const day = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      start.setHours(0, 0, 0, 0);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    const startStr = start.toISOString();

    const { data: requests } = await db
      .from("test_requests")
      .select("id, section, status, requested_at, received_at, resulted_at")
      .eq("facility_id", facilityId)
      .gte("requested_at", startStr);

    const resulted = (requests ?? []).filter((r) => r.status === "resulted");
    const received = (requests ?? []).filter((r) =>
      ["received", "in_progress", "resulted"].includes(r.status)
    );

    let totalTat = 0;
    let tatCount = 0;
    const bySection: Record<string, { count: number; tatSum: number; tatCount: number }> = {};

    for (const r of resulted) {
      const rec = r.received_at ? new Date(r.received_at) : null;
      const res = r.resulted_at ? new Date(r.resulted_at) : null;
      if (rec && res) {
        const tat = Math.floor((res.getTime() - rec.getTime()) / 60000);
        totalTat += tat;
        tatCount++;
        const sec = r.section || "N/A";
        if (!bySection[sec]) bySection[sec] = { count: 0, tatSum: 0, tatCount: 0 };
        bySection[sec].count++;
        bySection[sec].tatSum += tat;
        bySection[sec].tatCount++;
      }
    }

    const { count: breachCount } = await db
      .from("tat_breaches")
      .select("id", { count: "exact", head: true })
      .eq("facility_id", facilityId)
      .gte("detected_at", startStr);

    const bySectionArr = Object.entries(bySection).map(([section, v]) => ({
      section,
      count: v.count,
      avgTat: v.tatCount > 0 ? Math.round(v.tatSum / v.tatCount) : 0,
    }));

    return NextResponse.json({
      data: {
        totalResulted: resulted.length,
        totalReceived: received.length,
        avgTatMinutes: tatCount > 0 ? Math.round(totalTat / tatCount) : 0,
        breachCount: breachCount ?? 0,
        bySection: bySectionArr,
      },
    });
  } catch (err) {
    console.error("[GET /api/performance]", err);
    return NextResponse.json(
      { error: "Failed to fetch performance" },
      { status: 500 }
    );
  }
}
