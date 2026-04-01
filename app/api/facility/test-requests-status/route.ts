/**
 * GET /api/facility/test-requests-status — whether `test_requests` has any rows for this facility (ENG-89).
 * Used for Lab Metrics empty states when LIMS has not synced yet.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth, requireFacilityAccess } from "@/lib/auth/server";

export async function GET(req: NextRequest) {
  const facilityId = new URL(req.url).searchParams.get("facility_id");
  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const denied = requireAuth(ctx);
  if (denied) return denied;
  const access = requireFacilityAccess(ctx, facilityId);
  if (access) return access;

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();
    const { count, error } = await db
      .from("test_requests")
      .select("id", { count: "exact", head: true })
      .eq("facility_id", facilityId);

    if (error) {
      console.error("[GET /api/facility/test-requests-status]", error);
      return NextResponse.json({ error: "Failed to count test requests" }, { status: 500 });
    }

    const empty = (count ?? 0) === 0;
    return NextResponse.json({ empty });
  } catch (e) {
    console.error("[GET /api/facility/test-requests-status]", e);
    return NextResponse.json({ error: "Failed to count test requests" }, { status: 500 });
  }
}
