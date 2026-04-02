/**
 * PATCH /api/admin/hospitals/branch — Assign hospital to group + branch label (super-admin only). ENG-91
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, jsonError } from "@/lib/auth/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function PATCH(req: NextRequest) {
  if (!supabaseConfigured) {
    return jsonError("Not configured", 503);
  }

  const ctx = await getAuthContext(req);
  if (!ctx.user) return jsonError("Unauthorized", 401);
  if (!ctx.isSuperAdmin) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => ({}));
  const hospitalId = typeof body.hospital_id === "string" ? body.hospital_id.trim() : "";
  if (!hospitalId) {
    return jsonError("hospital_id is required", 400);
  }

  const groupIdRaw = body.group_id;
  const groupId =
    groupIdRaw === null || groupIdRaw === ""
      ? null
      : typeof groupIdRaw === "string"
        ? groupIdRaw.trim()
        : null;

  let branchName: string | null = null;
  if (body.branch_name === null) {
    branchName = null;
  } else if (typeof body.branch_name === "string") {
    branchName = body.branch_name.trim() || null;
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    if (groupId) {
      const { data: g } = await db.from("hospital_groups").select("id").eq("id", groupId).maybeSingle();
      if (!g) {
        return jsonError("Invalid group_id", 400);
      }
    }

    const updates: { group_id: string | null; branch_name: string | null } = {
      group_id: groupId,
      branch_name: groupId ? branchName : null,
    };

    const { error } = await db.from("hospitals").update(updates).eq("id", hospitalId);
    if (error) throw error;

    return NextResponse.json({ ok: true, group_id: updates.group_id, branch_name: updates.branch_name });
  } catch (e) {
    console.error("[PATCH /api/admin/hospitals/branch]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 }
    );
  }
}
