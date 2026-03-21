/**
 * PATCH /api/qc/qualitative/configs/:id — Update qualitative QC config
 * DELETE /api/qc/qualitative/configs/:id — Delete qualitative QC config
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
    if (body.test_name !== undefined) updates.test_name = body.test_name;
    if (body.result_type !== undefined) updates.result_type = body.result_type;
    if (body.lot_number !== undefined) updates.lot_number = body.lot_number;
    if (body.manufacturer !== undefined) updates.manufacturer = body.manufacturer;
    if (body.expiry_date !== undefined) updates.expiry_date = body.expiry_date;
    if (body.frequency !== undefined) updates.frequency = body.frequency;
    if (body.controls !== undefined) updates.controls = body.controls;

    const { error } = await db
      .from("qualitative_qc_configs")
      .update(updates)
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/qc/qualitative/configs/:id]", err);
    return NextResponse.json(
      { error: "Failed to update config" },
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
      .from("qualitative_qc_configs")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/qc/qualitative/configs/:id]", err);
    return NextResponse.json(
      { error: "Failed to delete config" },
      { status: 500 }
    );
  }
}
