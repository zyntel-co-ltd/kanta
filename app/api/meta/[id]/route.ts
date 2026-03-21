/**
 * PATCH /api/meta/[id] — Update test metadata
 * DELETE /api/meta/[id] — Delete test metadata
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
  const { testName, section, price, tatMinutes } = body;

  if (!supabaseConfigured) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (testName !== undefined) updates.test_name = String(testName).trim();
    if (section !== undefined) updates.section = String(section).trim();
    if (price !== undefined) updates.price = parseFloat(price) ?? 0;
    if (tatMinutes !== undefined) updates.tat_minutes = parseInt(tatMinutes, 10) || 60;

    const { error } = await db
      .from("test_metadata")
      .update(updates)
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/meta]", err);
    return NextResponse.json(
      { error: "Failed to update metadata" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!supabaseConfigured) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { error } = await db.from("test_metadata").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/meta]", err);
    return NextResponse.json(
      { error: "Failed to delete metadata" },
      { status: 500 }
    );
  }
}
