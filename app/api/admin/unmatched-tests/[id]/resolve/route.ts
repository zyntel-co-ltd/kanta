/**
 * POST /api/admin/unmatched-tests/:id/resolve — Mark unmatched test as resolved
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAdminUserManagement } from "@/lib/auth/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: row } = await db
      .from("unmatched_tests")
      .select("facility_id")
      .eq("id", id)
      .single();

    if (!row?.facility_id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const ctx = await getAuthContext(req, {
      facilityIdHint: row.facility_id as string,
    });
    const denied = requireAdminUserManagement(ctx, row.facility_id as string);
    if (denied) return denied;

    const { error } = await db
      .from("unmatched_tests")
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/admin/unmatched-tests/:id/resolve]", err);
    return NextResponse.json(
      { error: "Failed to resolve unmatched test" },
      { status: 500 }
    );
  }
}
