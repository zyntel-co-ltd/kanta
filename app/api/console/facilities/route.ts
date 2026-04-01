/**
 * GET /api/console/facilities — List all hospitals (Zyntel super-admin only).
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
      .from("hospitals")
      .select("id, name, city, country, tier, created_at")
      .order("name");

    if (error) {
      console.error("[GET /api/console/facilities]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("[GET /api/console/facilities]", e);
    return NextResponse.json({ error: "Failed to list facilities" }, { status: 500 });
  }
}
