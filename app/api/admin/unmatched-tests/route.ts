/**
 * GET /api/admin/unmatched-tests — List unresolved unmatched tests
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAdminUserManagement } from "@/lib/auth/server";

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
    return NextResponse.json([]);
  }

  const ctx = await getAuthContext(req);
  const denied = requireAdminUserManagement(ctx, facilityId);
  if (denied) return denied;

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data, error } = await db
      .from("unmatched_tests")
      .select("id, test_name, source, first_seen, occurrence_count")
      .eq("facility_id", facilityId)
      .eq("is_resolved", false)
      .order("occurrence_count", { ascending: false });

    if (error) throw error;

    const items = (data ?? []).map((r) => ({
      id: r.id,
      test_name: r.test_name,
      source: r.source ?? "",
      first_seen: r.first_seen,
      occurrence_count: r.occurrence_count ?? 1,
    }));

    return NextResponse.json(items);
  } catch (err) {
    console.error("[GET /api/admin/unmatched-tests]", err);
    return NextResponse.json(
      { error: "Failed to fetch unmatched tests" },
      { status: 500 }
    );
  }
}
