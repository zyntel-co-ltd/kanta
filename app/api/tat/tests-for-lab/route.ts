/**
 * GET /api/tat/tests-for-lab — all test_requests for a given lab_number.
 * Used by the TestsForLabDialog (double-click on lab number).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireFacilityAccess, jsonError } from "@/lib/auth/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id")?.trim();
  const labNumber = searchParams.get("lab_number")?.trim();

  if (!facilityId) return jsonError("facility_id is required", 400);
  if (!labNumber) return jsonError("lab_number is required", 400);

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const accessErr = requireFacilityAccess(ctx, facilityId);
  if (accessErr) return accessErr;

  if (!supabaseConfigured) {
    return NextResponse.json({ rows: [] });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data, error } = await db
      .from("test_requests")
      .select(
        "id, test_name, section, status, requested_at, received_at, resulted_at, section_time_in, section_time_out"
      )
      .eq("facility_id", facilityId)
      .eq("lab_number", labNumber)
      .order("requested_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({ rows: data ?? [] });
  } catch (err) {
    console.error("[GET /api/tat/tests-for-lab]", err);
    return NextResponse.json({ error: "Failed to fetch tests for lab number" }, { status: 500 });
  }
}
