/**
 * GET /api/admin/stats — Dashboard stats for admin panel
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");

  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({
      totalTests: 0,
      totalUsers: 0,
      unmatchedTests: 0,
      recentCancellations: 0,
    });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startStr = thirtyDaysAgo.toISOString().slice(0, 10);

    const [
      { count: totalTests },
      { count: totalUsers },
      { count: unmatchedTests },
      { count: recentCancellations },
    ] = await Promise.all([
      db
        .from("test_requests")
        .select("id", { count: "exact", head: true })
        .eq("facility_id", facilityId)
        .gte("created_at", startStr),
      db
        .from("facility_users")
        .select("id", { count: "exact", head: true })
        .eq("facility_id", facilityId)
        .eq("is_active", true),
      db
        .from("unmatched_tests")
        .select("id", { count: "exact", head: true })
        .eq("facility_id", facilityId)
        .eq("is_resolved", false),
      db
        .from("test_cancellations")
        .select("id", { count: "exact", head: true })
        .eq("facility_id", facilityId)
        .gte("cancelled_at", startStr),
    ]);

    return NextResponse.json({
      totalTests: totalTests ?? 0,
      totalUsers: totalUsers ?? 0,
      unmatchedTests: unmatchedTests ?? 0,
      recentCancellations: recentCancellations ?? 0,
    });
  } catch (err) {
    console.error("[GET /api/admin/stats]", err);
    return NextResponse.json(
      {
        totalTests: 0,
        totalUsers: 0,
        unmatchedTests: 0,
        recentCancellations: 0,
      },
      { status: 500 }
    );
  }
}
