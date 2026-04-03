/**
 * ENG-98: Persist `facility_capability_profile.test_name_mappings` (JSON array).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAdminPanel } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const facilityId = typeof body.facility_id === "string" ? body.facility_id : "";
  const mappings = body.test_name_mappings;
  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }
  if (!Array.isArray(mappings)) {
    return NextResponse.json({ error: "test_name_mappings must be an array" }, { status: 400 });
  }
  if (!supabaseConfigured) {
    return NextResponse.json({ ok: true });
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const denied = requireAdminPanel(ctx, facilityId);
  if (denied) return denied;

  const db = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await db.from("facility_capability_profile").upsert(
    {
      facility_id: facilityId,
      has_tat: true,
      has_revenue: false,
      has_refrigerator_monitoring: false,
      has_qc: false,
      has_equipment: true,
      test_name_mappings: mappings,
      updated_at: now,
    },
    { onConflict: "facility_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
