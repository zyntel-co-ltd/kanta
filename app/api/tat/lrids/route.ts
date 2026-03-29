/**
 * GET /api/tat/lrids — completed results ready for collection (LRIDS display)
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");
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

    const [runsRes, hospRes] = await Promise.all([
      db
        .from("test_requests")
        .select("*")
        .eq("facility_id", facilityId)
        .eq("status", "resulted")
        .order("resulted_at", { ascending: false })
        .limit(limit),
      db.from("hospitals").select("name, logo_url").eq("id", facilityId).maybeSingle(),
    ]);

    if (runsRes.error) throw runsRes.error;

    return NextResponse.json({
      data: runsRes.data ?? [],
      error: null,
      hospital_name: hospRes.data?.name ?? null,
      hospital_logo_url: hospRes.data?.logo_url ?? null,
    });
  } catch (err) {
    console.error("[GET /api/tat/lrids]", err);
    return NextResponse.json(
      { data: null, error: "Failed to fetch LRIDS" },
      { status: 500 }
    );
  }
}
