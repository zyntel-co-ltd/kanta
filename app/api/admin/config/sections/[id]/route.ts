/**
 * PATCH /api/admin/config/sections/:id — Update lab section (ENG-85)
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
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const body = await req.json();
  if (!supabaseConfigured) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: row } = await db
      .from("lab_sections")
      .select("facility_id, name, abbreviation, code, is_active")
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
    if (typeof body.abbreviation === "string" && body.abbreviation.trim()) {
      updates.abbreviation = body.abbreviation.trim();
    }
    if (typeof body.is_active === "boolean") {
      if (body.is_active === false) {
        const { count } = await db
          .from("lab_sections")
          .select("id", { count: "exact", head: true })
          .eq("facility_id", facilityId)
          .eq("is_active", true)
          .neq("id", id);
        if ((count ?? 0) < 1) {
          return NextResponse.json(
            { error: "At least one active lab section is required" },
            { status: 400 }
          );
        }
      }
      updates.is_active = body.is_active;
    }

    const oldSnap = {
      name: row.name,
      abbreviation: row.abbreviation,
      code: row.code,
      is_active: row.is_active,
    };

    const { error } = await db.from("lab_sections").update(updates).eq("id", id);
    if (error) throw error;

    await writeAuditLog({
      facilityId,
      userId: ctx.user?.id ?? null,
      action: "lab_section.updated",
      entityType: "lab_section",
      entityId: id,
      oldValue: oldSnap,
      newValue: { ...oldSnap, ...updates },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/admin/config/sections/:id]", e);
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
}
