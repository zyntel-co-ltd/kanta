/**
 * ENG-92: TAT benchmarks for the authenticated facility (last 30 days).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import {
  authenticatePublicApi,
  facilityMismatchResponse,
} from "@/lib/api/authenticate";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ facilityId: string }> }
) {
  const { facilityId } = await params;
  const auth = await authenticatePublicApi(req);
  if (!auth.ok) return auth.response;
  if (auth.auth.facilityId !== facilityId) {
    return facilityMismatchResponse();
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const db = createAdminClient();
  const { data: rows } = await db
    .from("test_requests")
    .select("section, received_at, resulted_at")
    .eq("facility_id", facilityId)
    .gte("received_at", since.toISOString())
    .not("received_at", "is", null)
    .not("resulted_at", "is", null);

  const tats: number[] = [];
  const bySection: Record<string, number[]> = {};
  for (const r of rows ?? []) {
    const a = new Date(r.received_at as string).getTime();
    const b = new Date(r.resulted_at as string).getTime();
    if (b < a) continue;
    const m = Math.floor((b - a) / 60000);
    tats.push(m);
    const sec = String(r.section ?? "Unknown");
    if (!bySection[sec]) bySection[sec] = [];
    bySection[sec].push(m);
  }

  const sorted = [...tats].sort((x, y) => x - y);
  const avgTATMinutes =
    sorted.length > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0;
  const medianTATMinutes =
    sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] ?? 0 : 0;

  const onTime = sorted.filter((m) => m <= 120).length;
  const onTimeRate =
    sorted.length > 0 ? Math.round((onTime / sorted.length) * 1000) / 1000 : 0;

  const bySectionOut = Object.entries(bySection).map(([section, vals]) => {
    const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    const ot = vals.filter((m) => m <= 120).length;
    const rate = vals.length ? Math.round((ot / vals.length) * 1000) / 1000 : 0;
    return { section, avgTAT: avg, onTimeRate: rate };
  });

  const generatedAt = new Date().toISOString();
  const body = {
    facilityId,
    period: "30d" as const,
    avgTATMinutes,
    medianTATMinutes,
    onTimeRate,
    bySection: bySectionOut,
    generatedAt,
  };

  const h = new Headers(auth.headers);
  return NextResponse.json(body, { headers: h });
}
