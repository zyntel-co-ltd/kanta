/**
 * POST /api/admin/users/:id/toggle-active — Toggle user active status (admin panel only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAdminPanel } from "@/lib/auth/server";
import { writeAuditLog } from "@/lib/audit";
import { normalizeFacilityRoleInput, roleRank } from "@/lib/auth/roles";

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
      .select("facility_id, user_id, is_active, role")
      .eq("id", id)
      .single();

    if (!row?.facility_id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const ctx = await getAuthContext(req, {
      facilityIdHint: row.facility_id as string,
    });
    const denied = requireAdminPanel(ctx, row.facility_id as string);
    if (denied) return denied;

    const targetRole = normalizeFacilityRoleInput(row.role);
    if (!ctx.isSuperAdmin && ctx.role) {
      if (roleRank(targetRole) > roleRank(ctx.role)) {
        return NextResponse.json(
          { error: "You cannot modify a user above your role" },
          { status: 403 }
        );
      }
    }

    if (ctx.user?.id === row.user_id && is_active === false) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 403 }
      );
    }

    const { error } = await db
      .from("facility_users")
      .update({ is_active: !!is_active, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    const wasActive = row.is_active !== false;
    await writeAuditLog({
      facilityId: row.facility_id as string,
      userId: ctx.user?.id ?? null,
      action: is_active ? "user.reactivated" : "user.deactivated",
      entityType: "facility_user",
      entityId: id,
      oldValue: { is_active: wasActive },
      newValue: { is_active: !!is_active },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/admin/users/:id/toggle-active]", err);
    return NextResponse.json({ error: "Failed to toggle status" }, { status: 500 });
  }
}
