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
    return NextResponse.json({ data: [] });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await db
      .from("qc_lot_recommendations")
      .select("*")
      .eq("facility_id", facilityId)
      .in("status", ["open", "acknowledged"])
      .gte("last_detected_at", cutoff)
      .order("last_detected_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("[GET /api/qc/recommendations]", err);
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}
