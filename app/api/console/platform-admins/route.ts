/**
 * GET /api/console/platform-admins — Read-only list for Console (Zyntel super-admin only).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, jsonError } from "@/lib/auth/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(_req: NextRequest) {
  if (!supabaseConfigured) {
    return NextResponse.json([]);
  }

  const ctx = await getAuthContext(_req);
  if (!ctx.user) return jsonError("Unauthorized", 401);
  if (!ctx.isSuperAdmin) return jsonError("Forbidden", 403);

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();
    const { data, error } = await db
      .from("platform_admins")
      .select("user_id, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/console/platform-admins]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("[GET /api/console/platform-admins]", e);
    return NextResponse.json({ error: "Failed to list platform admins" }, { status: 500 });
  }
}
