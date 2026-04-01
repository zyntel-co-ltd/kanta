/**
 * POST /api/console/users — Create first facility_admin for a hospital (Zyntel super-admin only).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, jsonError } from "@/lib/auth/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function POST(req: NextRequest) {
  if (!supabaseConfigured) {
    return jsonError("Not configured", 503);
  }

  const ctx = await getAuthContext(req);
  if (!ctx.user) return jsonError("Unauthorized", 401);
  if (!ctx.isSuperAdmin) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => ({}));
  const facility_id = typeof body.facility_id === "string" ? body.facility_id.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const full_name = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!facility_id || !email || !full_name || password.length < 8) {
    return jsonError("facility_id, email, full_name, and password (min 8 chars) required", 400);
  }
  if (!email.includes("@")) {
    return jsonError("Valid email required", 400);
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const authAdmin = (
      db.auth as {
        admin?: {
          createUser: (opts: {
            email: string;
            password: string;
            email_confirm?: boolean;
            user_metadata?: Record<string, unknown>;
          }) => Promise<{
            data: { user?: { id: string; email?: string } };
            error: { message?: string } | null;
          }>;
        };
      }
    ).admin;

    if (!authAdmin) {
      return jsonError("Auth admin not available", 500);
    }

    const { data: authData, error: authError } = await authAdmin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: full_name,
        full_name,
        name: full_name,
      },
    });

    if (authError || !authData.user?.id) {
      return NextResponse.json(
        { error: authError?.message || "Could not create user" },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    const { error: fuErr } = await db.from("facility_users").insert({
      facility_id,
      user_id: userId,
      role: "facility_admin",
      is_active: true,
    });

    if (fuErr) {
      console.error("[POST /api/console/users] facility_users", fuErr);
      try {
        await (db.auth as { admin?: { deleteUser: (id: string) => Promise<unknown> } }).admin?.deleteUser(
          userId
        );
      } catch {
        /* ignore */
      }
      return NextResponse.json({ error: "Could not link user to facility" }, { status: 500 });
    }

    return NextResponse.json({
      user_id: userId,
      email: authData.user.email ?? email,
    });
  } catch (e) {
    console.error("[POST /api/console/users]", e);
    return NextResponse.json({ error: "Failed to create admin" }, { status: 500 });
  }
}
