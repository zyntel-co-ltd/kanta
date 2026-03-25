/**
 * PUT /api/admin/users/:id — Update facility user (admin/manager)
 * DELETE — disabled; use deactivate (toggle-active) instead
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAdminUserManagement } from "@/lib/auth/server";
import { FACILITY_ROLES, isFacilityRole } from "@/lib/auth/roles";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { role, email } = body;

  if (!id) {
    return NextResponse.json({ error: "User id required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: facilityRow } = await db
      .from("facility_users")
      .select("facility_id, user_id")
      .eq("id", id)
      .single();

    if (!facilityRow?.facility_id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const ctx = await getAuthContext(req, {
      facilityIdHint: facilityRow.facility_id as string,
    });
    const denied = requireAdminUserManagement(ctx, facilityRow.facility_id as string);
    if (denied) return denied;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (role && isFacilityRole(role) && FACILITY_ROLES.includes(role)) {
      updates.role = role;
    }

    const { error } = await db
      .from("facility_users")
      .update(updates)
      .eq("id", id);

    if (error) throw error;

    if (email !== undefined && facilityRow.user_id) {
      const authAdmin = (db.auth as { admin?: { updateUserById: (id: string, attrs: { email?: string }) => Promise<unknown> } }).admin;
      if (authAdmin) await authAdmin.updateUserById(facilityRow.user_id as string, { email: String(email).trim() || undefined });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/admin/users/:id]", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json(
    {
      error:
        "Deleting users is disabled. Deactivate the account instead (toggle active status).",
    },
    { status: 405 }
  );
}
