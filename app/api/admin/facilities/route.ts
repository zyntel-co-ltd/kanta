/**
 * GET /api/admin/facilities — List hospitals for facility selector (super admins only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(_req: NextRequest) {
  const ctx = await getAuthContext(_req);
  const denied = requireAuth(ctx);
  if (denied) return denied;

  if (!ctx.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json([]);
  }

  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("hospitals")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("[GET /api/admin/facilities]", e);
    return NextResponse.json({ error: "Failed to list facilities" }, { status: 500 });
  }
}
