/**
 * POST /api/admin/users/:id/reset-password — Reset user password (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAdminPanel } from "@/lib/auth/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { password } = body;

  if (!id || !password) {
    return NextResponse.json(
      { error: "id and password required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: fu } = await db
      .from("facility_users")
      .select("user_id, facility_id")
      .eq("id", id)
      .single();

    if (!fu?.facility_id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const ctx = await getAuthContext(req, {
      facilityIdHint: fu.facility_id as string,
    });
    const denied = requireAdminPanel(ctx, fu.facility_id as string);
    if (denied) return denied;
    const userId = fu?.user_id ?? id;

    // Service role client has auth.admin
    const { error } = await (db.auth as { admin?: { updateUserById: (id: string, attrs: { password?: string }) => Promise<{ error: unknown }> } }).admin!.updateUserById(userId, { password });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/admin/users/:id/reset-password]", err);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
