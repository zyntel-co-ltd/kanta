/**
 * GET /api/capability — facility capability profile (for Adaptive Presence)
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id") ?? "6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5";

  if (!supabaseConfigured) {
    return NextResponse.json({
      data: {
        facility_id: facilityId,
        has_tat: false,
        has_revenue: false,
        has_refrigerator_monitoring: false,
        has_qc: false,
        has_equipment: true,
      },
      error: null,
    });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data, error } = await db
      .from("facility_capability_profile")
      .select("*")
      .eq("facility_id", facilityId)
      .single();

    if (error || !data) {
      return NextResponse.json({
        data: {
          facility_id: facilityId,
          has_tat: false,
          has_revenue: false,
          has_refrigerator_monitoring: false,
          has_qc: false,
          has_equipment: true,
        },
        error: null,
      });
    }

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error("[GET /api/capability]", err);
    return NextResponse.json(
      { data: null, error: "Failed to fetch capability" },
      { status: 500 }
    );
  }
}
