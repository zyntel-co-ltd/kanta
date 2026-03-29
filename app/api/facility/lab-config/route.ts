/**
 * GET /api/facility/lab-config — Active lab sections, shifts, TAT targets for Lab Metrics filters.
 * Authenticated users scoped to their facility (ENG-85 / ENG-86).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth, requireFacilityAccess } from "@/lib/auth/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");

  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const denied = requireAuth(ctx);
  if (denied) return denied;
  const access = requireFacilityAccess(ctx, facilityId);
  if (access) return access;

  if (!supabaseConfigured) {
    return NextResponse.json({
      sections: [],
      shifts: [],
      tatTargets: [],
    });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const [{ data: sections }, { data: shifts }, { data: targets }] = await Promise.all([
      db
        .from("lab_sections")
        .select("id, name, abbreviation, code, is_active, sort_order")
        .eq("facility_id", facilityId)
        .order("sort_order", { ascending: true }),
      db
        .from("lab_shifts")
        .select("id, name, start_time, end_time, is_active")
        .eq("facility_id", facilityId)
        .order("start_time", { ascending: true }),
      db
        .from("tat_targets")
        .select("id, section, section_id, target_minutes, test_name")
        .eq("facility_id", facilityId)
        .is("test_name", null),
    ]);

    return NextResponse.json({
      sections: sections ?? [],
      shifts: shifts ?? [],
      tatTargets: targets ?? [],
    });
  } catch (e) {
    console.error("[GET /api/facility/lab-config]", e);
    return NextResponse.json({ error: "Failed to load lab config" }, { status: 500 });
  }
}
