/**
 * PATCH /api/v1/equipment/:id — update equipment (status-only quick path or full detail update, ENG-110)
 */

import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, Equipment } from "@/types";
import { getAuthContext } from "@/lib/auth/server";
import { writeAuditLog } from "@/lib/audit";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

const STATUSES = ["operational", "maintenance", "offline", "retired"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Equipment>>> {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ data: null, error: "equipment id is required" }, { status: 400 });
  }

  try {
    const body = await req.json();

    if (!supabaseConfigured) {
      return NextResponse.json({ data: null, error: "Supabase not configured" }, { status: 501 });
    }

    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: prev } = await db
      .from("equipment")
      .select("facility_id, status")
      .eq("id", id)
      .maybeSingle();

    const updateRow: Record<string, unknown> = {};

    if (body.name !== undefined) updateRow.name = body.name;
    if (body.department_id !== undefined) updateRow.department_id = body.department_id;
    if (body.model !== undefined) updateRow.model = body.model;
    if (body.serial_number !== undefined) updateRow.serial_number = body.serial_number;
    if (body.category !== undefined) updateRow.category = body.category;
    if (body.location !== undefined) updateRow.location = body.location;
    if (body.next_maintenance_at !== undefined) updateRow.next_maintenance_at = body.next_maintenance_at;
    if (body.manufacturer !== undefined) updateRow.manufacturer = body.manufacturer;
    if (body.purchase_date !== undefined) updateRow.purchase_date = body.purchase_date;
    if (body.purchase_value !== undefined) updateRow.purchase_value = body.purchase_value;
    if (body.notes !== undefined) updateRow.notes = body.notes;

    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json(
          { data: null, error: "status must be one of: operational, maintenance, offline, retired" },
          { status: 400 }
        );
      }
      updateRow.status = body.status;
    }

    if (Object.keys(updateRow).length === 0) {
      return NextResponse.json({ data: null, error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await db
      .from("equipment")
      .update(updateRow)
      .eq("id", id)
      .select(`*, department:departments(id, name)`)
      .single();

    if (error) throw error;

    const ctx = await getAuthContext(req);
    await writeAuditLog({
      facilityId: (prev?.facility_id as string) ?? null,
      userId: ctx.user?.id ?? null,
      action: "equipment.updated",
      entityType: "equipment",
      entityId: id,
      oldValue: { status: prev?.status },
      newValue: updateRow,
    });

    return NextResponse.json({ data: data as Equipment, error: null });
  } catch (err) {
    console.error("[PATCH /api/v1/equipment/:id]", err);
    return NextResponse.json(
      { data: null, error: "Failed to update equipment" },
      { status: 500 }
    );
  }
}
