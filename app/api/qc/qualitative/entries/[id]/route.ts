/**
 * PATCH /api/qc/qualitative/entries/:id — Update a qualitative QC entry (e.g. submit draft)
 * DELETE /api/qc/qualitative/entries/:id — Delete a qualitative QC entry
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
    if (body.run_at           !== undefined) updates.run_at            = body.run_at;
    if (body.control_results  !== undefined) updates.control_results   = body.control_results;
    if (body.overall_pass     !== undefined) updates.overall_pass      = body.overall_pass;
    if (body.corrective_action !== undefined) updates.corrective_action = body.corrective_action;
    if (body.entered_by       !== undefined) updates.entered_by        = body.entered_by;
    if (body.submitted        !== undefined) updates.submitted         = body.submitted;

    const { error } = await db
      .from("qualitative_qc_entries")
      .update(updates)
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/qc/qualitative/entries/:id]", err);
    return NextResponse.json(
      { error: "Failed to update entry" },
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
      .from("qualitative_qc_entries")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/qc/qualitative/entries/:id]", err);
    return NextResponse.json(
      { error: "Failed to delete entry" },
      { status: 500 }
    );
  }
}
