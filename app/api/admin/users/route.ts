/**
 * GET /api/admin/users — List facility users (admin/manager)
 * POST /api/admin/users — Create user (admin/manager)
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");

  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json([]);
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: facilityUsers, error } = await db
      .from("facility_users")
      .select("id, user_id, role, is_active, created_at")
      .eq("facility_id", facilityId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const users = (facilityUsers ?? []).map((u) => ({
      id: u.id,
      user_id: u.user_id,
      username: u.user_id?.slice(0, 8) ?? "—",
      email: "", // Populated from auth if available
      role: u.role,
      is_active: u.is_active ?? true,
      last_login: null,
      created_at: u.created_at,
    }));

    return NextResponse.json(users);
  } catch (err) {
    console.error("[GET /api/admin/users]", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { facility_id, username, email, password, role } = body;

  if (!facility_id || !username || !password || !role) {
    return NextResponse.json(
      { error: "facility_id, username, password, role required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ id: "mock-1" }, { status: 201 });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const authAdmin = (db.auth as { admin?: { createUser: (opts: { email: string; password: string; email_confirm?: boolean; user_metadata?: Record<string, unknown> }) => Promise<{ data: { user?: { id: string; email?: string } }; error: { message?: string } | null }> } }).admin;
    if (!authAdmin) throw new Error("Auth admin not available");
    const { data: authData, error: authError } = await authAdmin.createUser({
      email: email || `${username}@kanta.local`,
      password,
      email_confirm: true,
      user_metadata: { username },
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message || "Failed to create user" },
        { status: 400 }
      );
    }

    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "User created but no ID returned" }, { status: 500 });
    }

    const { data: fuData, error: fuError } = await db
      .from("facility_users")
      .insert({
        facility_id,
        user_id: userId,
        role: ["admin", "manager", "technician", "viewer", "reception"].includes(role) ? role : "viewer",
        is_active: true,
      })
      .select("id")
      .single();

    if (fuError) throw fuError;

    return NextResponse.json(
      { id: fuData?.id ?? userId, username, email: authData.user?.email },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/admin/users]", err);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
