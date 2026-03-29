/**
 * PATCH /api/v1/equipment/:id — update equipment (e.g. status)
 */

import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, Equipment } from "@/types";
import { getAuthContext } from "@/lib/auth/server";
import { writeAuditLog } from "@/lib/audit";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

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
    const { status } = body;

    if (!status || !["operational", "maintenance", "offline", "retired"].includes(status)) {
      return NextResponse.json(
        { data: null, error: "status must be one of: operational, maintenance, offline, retired" },
        { status: 400 }
      );
    }

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

    const { data, error } = await db
      .from("equipment")
      .update({ status })
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
      newValue: { status },
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
