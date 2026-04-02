/**
 * PATCH /api/admin/groups/[id] — Update group name/slug (super-admin only).
 * DELETE /api/admin/groups/[id] — Remove group; clears group_id on member hospitals. ENG-91
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, jsonError } from "@/lib/auth/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseConfigured) {
    return jsonError("Not configured", 503);
  }

  const auth = await getAuthContext(req);
  if (!auth.user) return jsonError("Unauthorized", 401);
  if (!auth.isSuperAdmin) return jsonError("Forbidden", 403);

  const { id } = await params;
  if (!id) return jsonError("Invalid id", 400);

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, string> = {};
  if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
  if (typeof body.slug === "string" && body.slug.trim()) {
    updates.slug = body.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("No valid fields to update", 400);
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();
    const { data, error } = await db
      .from("hospital_groups")
      .update(updates)
      .eq("id", id)
      .select("id, name, slug, created_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) return jsonError("Not found", 404);
    return NextResponse.json(data);
  } catch (e) {
    console.error("[PATCH /api/admin/groups/[id]]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseConfigured) {
    return jsonError("Not configured", 503);
  }

  const auth = await getAuthContext(req);
  if (!auth.user) return jsonError("Unauthorized", 401);
  if (!auth.isSuperAdmin) return jsonError("Forbidden", 403);

  const { id } = await params;
  if (!id) return jsonError("Invalid id", 400);

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();
    await db.from("hospitals").update({ group_id: null, branch_name: null }).eq("group_id", id);
    const { error } = await db.from("hospital_groups").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/admin/groups/[id]]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 }
    );
  }
}
