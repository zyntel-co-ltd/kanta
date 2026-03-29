/**
 * PATCH/DELETE /api/admin/config/shifts/:id (ENG-85)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAdminPanel } from "@/lib/auth/server";
import { writeAuditLog } from "@/lib/audit";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json();
  if (!supabaseConfigured) return NextResponse.json({ ok: true });

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: row } = await db
      .from("lab_shifts")
      .select("facility_id, name, start_time, end_time, is_active")
      .eq("id", id)
      .single();

    if (!row?.facility_id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const facilityId = row.facility_id as string;
    const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
    const denied = requireAdminPanel(ctx, facilityId);
    if (denied) return denied;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.start_time === "string" && body.start_time.trim()) {
      updates.start_time = body.start_time.trim();
    }
    if (typeof body.end_time === "string" && body.end_time.trim()) {
      updates.end_time = body.end_time.trim();
    }
    if (typeof body.is_active === "boolean") updates.is_active = body.is_active;

    const oldSnap = {
      name: row.name,
      start_time: row.start_time,
      end_time: row.end_time,
      is_active: row.is_active,
    };

    const { error } = await db.from("lab_shifts").update(updates).eq("id", id);
    if (error) throw error;

    await writeAuditLog({
      facilityId,
      userId: ctx.user?.id ?? null,
      action: "lab_shift.updated",
      entityType: "lab_shift",
      entityId: id,
      oldValue: oldSnap,
      newValue: { ...oldSnap, ...updates },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/admin/config/shifts/:id]", e);
    return NextResponse.json({ error: "Failed to update shift" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (!supabaseConfigured) return NextResponse.json({ ok: true });

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: row } = await db
      .from("lab_shifts")
      .select("facility_id, name, start_time, end_time")
      .eq("id", id)
      .single();

    if (!row?.facility_id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const facilityId = row.facility_id as string;
    const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
    const denied = requireAdminPanel(ctx, facilityId);
    if (denied) return denied;

    const { count } = await db
      .from("lab_shifts")
      .select("id", { count: "exact", head: true })
      .eq("facility_id", facilityId);

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "At least one shift is required; add another shift before deleting this one." },
        { status: 400 }
      );
    }

    const { error } = await db.from("lab_shifts").delete().eq("id", id);
    if (error) throw error;

    await writeAuditLog({
      facilityId,
      userId: ctx.user?.id ?? null,
      action: "lab_shift.deleted",
      entityType: "lab_shift",
      entityId: id,
      oldValue: {
        name: row.name,
        start_time: row.start_time,
        end_time: row.end_time,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/admin/config/shifts/:id]", e);
    return NextResponse.json({ error: "Failed to delete shift" }, { status: 500 });
  }
}
