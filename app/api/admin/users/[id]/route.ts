/**
 * PUT /api/admin/users/:id — Update facility user (admin/manager)
 * DELETE /api/admin/users/:id — Delete facility user (admin only)
 */

import { NextRequest, NextResponse } from "next/server";

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

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (role && ["admin", "manager", "technician", "viewer", "reception"].includes(role)) {
      updates.role = role;
    }

    const { data: fu } = await db.from("facility_users").select("user_id").eq("id", id).single();

    const { error } = await db
      .from("facility_users")
      .update(updates)
      .eq("id", id);

    if (error) throw error;

    if (email !== undefined && fu?.user_id) {
      const authAdmin = (db.auth as { admin?: { updateUserById: (id: string, attrs: { email?: string }) => Promise<unknown> } }).admin;
      if (authAdmin) await authAdmin.updateUserById(fu.user_id, { email: String(email).trim() || undefined });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/admin/users/:id]", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "User id required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { error } = await db.from("facility_users").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/admin/users/:id]", err);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
