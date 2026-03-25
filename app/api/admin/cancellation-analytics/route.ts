/**
 * GET /api/admin/cancellation-analytics — Cancellation analytics by reason
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAdminUserManagement } from "@/lib/auth/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

function getDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now);

  switch (period) {
    case "thisMonth":
      start.setDate(1);
      break;
    case "lastMonth":
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      break;
    case "thisQuarter":
      start.setMonth(Math.floor(start.getMonth() / 3) * 3);
      start.setDate(1);
      break;
    case "lastQuarter":
      start.setMonth(Math.floor(start.getMonth() / 3) * 3 - 3);
      start.setDate(1);
      break;
    case "thisYear":
      start.setMonth(0);
      start.setDate(1);
      break;
    case "lastYear":
      start.setFullYear(start.getFullYear() - 1);
      start.setMonth(0);
      start.setDate(1);
      break;
    default:
      start.setDate(1);
  }

  return { start: start.toISOString().slice(0, 10), end };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");
  const period = searchParams.get("period") ?? "thisMonth";
  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json([]);
  }

  const ctx = await getAuthContext(req);
  const denied = requireAdminUserManagement(ctx, facilityId);
  if (denied) return denied;

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { start, end } = getDateRange(period);

    const query = db
      .from("test_cancellations")
      .select("reason")
      .eq("facility_id", facilityId)
      .gte("cancelled_at", start)
      .lte("cancelled_at", end + "T23:59:59");

    const { data, error } = await query;

    if (error) throw error;

    const byReason: Record<string, number> = {};
    for (const r of data ?? []) {
      const reason = r.reason || "UNKNOWN";
      byReason[reason] = (byReason[reason] ?? 0) + 1;
    }

    const result = Object.entries(byReason).map(([reason, count]) => ({
      reason,
      count,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/admin/cancellation-analytics]", err);
    return NextResponse.json(
      { error: "Failed to fetch cancellation analytics" },
      { status: 500 }
    );
  }
}
