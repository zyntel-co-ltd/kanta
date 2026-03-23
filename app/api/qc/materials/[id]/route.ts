/**
 * PATCH /api/qc/materials/:id — Update a QC material (edit or toggle is_active)
 * DELETE /api/qc/materials/:id — Delete a QC material
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.name       !== undefined) updates.name        = body.name;
    if (body.analyte    !== undefined) updates.analyte     = body.analyte;
    if (body.level      !== undefined) updates.level       = body.level;
    if (body.lot_number !== undefined) updates.lot_number  = body.lot_number;
    if (body.expires_at !== undefined) updates.expires_at  = body.expires_at;
    if (body.target_mean !== undefined) updates.target_mean = body.target_mean;
    if (body.target_sd  !== undefined) updates.target_sd   = body.target_sd;
    if (body.units      !== undefined) updates.units       = body.units;
    if (body.is_active  !== undefined) updates.is_active   = body.is_active;

    const { error } = await db
      .from("qc_materials")
      .update(updates)
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/qc/materials/:id]", err);
    return NextResponse.json(
      { error: "Failed to update material" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const { error } = await db
      .from("qc_materials")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/qc/materials/:id]", err);
    return NextResponse.json(
      { error: "Failed to delete material" },
      { status: 500 }
    );
  }
}
