/**
 * ENG-98: Unmapped LIMS test names seen during sync (admin).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAdminPanel } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const facilityId = req.nextUrl.searchParams.get("facility_id");
  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }
  if (!supabaseConfigured) {
    return NextResponse.json({ rows: [] });
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const denied = requireAdminPanel(ctx, facilityId);
  if (denied) return denied;

  const db = createAdminClient();
  const { data, error } = await db
    .from("bridge_unmatched_test_names")
    .select("id, source_name, occurrence_count, first_seen, last_seen")
    .eq("facility_id", facilityId)
    .order("last_seen", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rows: data ?? [] });
}
