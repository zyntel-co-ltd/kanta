/**
 * GET /api/refrigerator/breaches — temp breach log
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");
  const unitId = searchParams.get("unit_id");
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  if (!facilityId) {
    return NextResponse.json(
      { data: null, error: "facility_id is required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ data: [], error: null });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    let q = db
      .from("temp_breaches")
      .select("*, unit:refrigerator_units(id, name, location)")
      .eq("facility_id", facilityId)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (unitId) q = q.eq("unit_id", unitId);

    const { data, error } = await q;

    if (error) throw error;

    return NextResponse.json({ data: data ?? [], error: null });
  } catch (err) {
    console.error("[GET /api/refrigerator/breaches]", err);
    return NextResponse.json(
      { data: null, error: "Failed to fetch breaches" },
      { status: 500 }
    );
  }
}
