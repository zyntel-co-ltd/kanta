/**
 * POST /api/admin/users/:id/toggle-active — Toggle user active status
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
  const body = await req.json().catch(() => ({}));
  const is_active = body.is_active ?? true;

  if (!id) {
    return NextResponse.json({ error: "User id required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: row } = await db
      .from("facility_users")
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
      .from("facility_users")
      .update({ is_active: !!is_active, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/admin/users/:id/toggle-active]", err);
    return NextResponse.json({ error: "Failed to toggle status" }, { status: 500 });
  }
}
