/**
 * GET /api/reception — Reception table (pending, received, in-progress tests)
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");
  const limit = parseInt(searchParams.get("limit") ?? "100", 10);

  if (!facilityId) {
    return NextResponse.json(
      { error: "facility_id required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ data: [] });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data, error } = await db
      .from("test_requests")
      .select("*")
      .eq("facility_id", facilityId)
      .in("status", ["pending", "received", "in_progress"])
      .order("requested_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("[GET /api/reception]", err);
    return NextResponse.json(
      { error: "Failed to fetch reception data" },
      { status: 500 }
    );
  }
}
