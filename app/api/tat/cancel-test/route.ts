/**
 * POST /api/tat/cancel-test — cancel a test_request (set status = 'cancelled').
 * Only facility members with write permission can cancel.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireFacilityAccess, jsonError } from "@/lib/auth/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function POST(req: NextRequest) {
  let body: { facility_id?: string; request_id?: string };
  try {
    body = (await req.json()) as { facility_id?: string; request_id?: string };
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const facilityId = body.facility_id?.trim();
  const requestId = body.request_id?.trim();

  if (!facilityId) return jsonError("facility_id is required", 400);
  if (!requestId) return jsonError("request_id is required", 400);

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const accessErr = requireFacilityAccess(ctx, facilityId);
  if (accessErr) return accessErr;

  if (!ctx.canWrite) {
    return jsonError("Write permission required to cancel tests", 403);
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ success: true, message: "Supabase not configured (dev mode)" });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { error } = await db
      .from("test_requests")
      .update({ status: "cancelled" })
      .eq("id", requestId)
      .eq("facility_id", facilityId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/tat/cancel-test]", err);
    return NextResponse.json({ error: "Failed to cancel test" }, { status: 500 });
  }
}
