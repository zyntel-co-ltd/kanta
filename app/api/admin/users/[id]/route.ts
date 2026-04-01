/**
 * PUT /api/admin/users/:id — Update facility user role (admin panel only)
 * DELETE — disabled; use deactivate (toggle-active) instead
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAdminPanel } from "@/lib/auth/server";
import { writeAuditLog } from "@/lib/audit";
import {
  FACILITY_ROLES,
  assignableFacilityRoles,
  isFacilityRole,
  normalizeFacilityRoleInput,
  roleRank,
  type FacilityRole,
} from "@/lib/auth/roles";

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
      .select("facility_id, user_id, role")
      .eq("id", id)
      .single();

    if (!facilityRow?.facility_id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const ctx = await getAuthContext(req, {
      facilityIdHint: facilityRow.facility_id as string,
    });
    const denied = requireAdminPanel(ctx, facilityRow.facility_id as string);
    if (denied) return denied;

    const targetUserId = facilityRow.user_id as string;
    const currentRole = normalizeFacilityRoleInput(facilityRow.role);

    if (!ctx.isSuperAdmin && ctx.role) {
      if (roleRank(currentRole) > roleRank(ctx.role)) {
        return NextResponse.json(
          { error: "You cannot modify a user above your role" },
          { status: 403 }
        );
      }
    }

    if (role !== undefined && isFacilityRole(role)) {
      const newRole: FacilityRole = role;
      const allowed = assignableFacilityRoles(ctx.role, ctx.isSuperAdmin);
      if (!allowed.includes(newRole)) {
        return NextResponse.json(
          { error: "You cannot assign this role" },
          { status: 403 }
        );
      }
      if (ctx.user?.id === targetUserId && newRole !== currentRole) {
        return NextResponse.json(
          { error: "You cannot change your own role" },
          { status: 403 }
        );
      }
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (role && isFacilityRole(role) && FACILITY_ROLES.includes(role)) {
      updates.role = role;
    }

    const { error } = await db.from("facility_users").update(updates).eq("id", id);

    if (error) throw error;

    if (updates.role !== undefined && updates.role !== currentRole) {
      await writeAuditLog({
        facilityId: facilityRow.facility_id as string,
        userId: ctx.user?.id ?? null,
        action: "user.role_changed",
        entityType: "facility_user",
        entityId: id,
        oldValue: { role: currentRole },
        newValue: { role: updates.role },
      });
    }

    if (email !== undefined && facilityRow.user_id) {
      const authAdmin = (
        db.auth as {
          admin?: {
            updateUserById: (
              id: string,
              attrs: { email?: string }
            ) => Promise<unknown>;
          };
        }
      ).admin;
      if (authAdmin) {
        await authAdmin.updateUserById(facilityRow.user_id as string, {
          email: String(email).trim() || undefined,
        });
      }
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
