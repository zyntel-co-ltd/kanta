/**
 * GET /api/admin/users — List facility users (admin/manager)
 * POST /api/admin/users — Create user (admin/manager)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAdminUserManagement } from "@/lib/auth/server";
import { FACILITY_ROLES, isFacilityRole } from "@/lib/auth/roles";

function normalizeRole(value: unknown): string {
  if (typeof value !== "string") return "viewer";
  const role = value.trim().toLowerCase();
  if (role === "admin") return "facility_admin";
  if (role === "manager") return "lab_manager";
  if (role === "technician" || role === "reception") return "lab_technician";
  if (role === "viewer") return "viewer";
  if (isFacilityRole(role)) return role;
  return "viewer";
}

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

  const ctx = await getAuthContext(req);
  const denied = requireAdminUserManagement(ctx, facilityId);
  if (denied) return denied;

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: facilityUsers, error } = await db
      .from("facility_users")
      .select("id, user_id, role, is_active, created_at")
      .eq("facility_id", facilityId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const emailById = new Map<string, string>();
    const usernameById = new Map<string, string>();
    const avatarById = new Map<string, string>();
    try {
      const listUsers = (db.auth as { admin?: { listUsers: (o: { page?: number; perPage?: number }) => Promise<{ data?: { users?: Array<{ id: string; email?: string; user_metadata?: { username?: string; display_name?: string; full_name?: string; name?: string; avatar_url?: string } }> } }> } }).admin?.listUsers;
      if (listUsers) {
        const { data: listData } = await listUsers({ page: 1, perPage: 1000 });
        for (const au of listData?.users ?? []) {
          emailById.set(au.id, au.email ?? "");
          const un =
            au.user_metadata?.display_name ||
            au.user_metadata?.full_name ||
            au.user_metadata?.name ||
            au.user_metadata?.username;
          if (un) usernameById.set(au.id, String(un));
          if (au.user_metadata?.avatar_url) avatarById.set(au.id, au.user_metadata.avatar_url);
        }
      }
    } catch {
      /* auth list optional */
    }

    const users = (facilityUsers ?? []).map((u) => {
      const uid = u.user_id as string;
      const email = emailById.get(uid) ?? "";
      const fallbackName = email ? email.split("@")[0] : "User";
      return {
        id: u.id,
        user_id: uid,
        username: usernameById.get(uid) || fallbackName,
        avatar_url: avatarById.get(uid) ?? null,
        email,
        role: normalizeRole(u.role),
        is_active: u.is_active ?? true,
        last_login: null,
        created_at: u.created_at,
      };
    });

    return NextResponse.json(users);
  } catch (err) {
    console.error("[GET /api/admin/users]", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { facility_id, username, email, password, role } = body;

  const emailTrim = typeof email === "string" ? email.trim() : "";
  const usernameTrim = typeof username === "string" ? username.trim() : "";
  const loginEmail =
    emailTrim || (usernameTrim ? `${usernameTrim}@kanta.local` : "");

  if (!facility_id || !password || !role || !loginEmail) {
    return NextResponse.json(
      {
        error:
          "facility_id, password, role, and email (or username) required — use a real email for sign-in",
      },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ id: "mock-1" }, { status: 201 });
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facility_id });
  const denied = requireAdminUserManagement(ctx, facility_id);
  if (denied) return denied;

  const resolvedRole = isFacilityRole(role) ? role : "viewer";

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const authAdmin = (db.auth as { admin?: { createUser: (opts: { email: string; password: string; email_confirm?: boolean; user_metadata?: Record<string, unknown> }) => Promise<{ data: { user?: { id: string; email?: string } }; error: { message?: string } | null }> } }).admin;
    if (!authAdmin) throw new Error("Auth admin not available");
    const displayName = usernameTrim || loginEmail.split("@")[0] || "user";
    const { data: authData, error: authError } = await authAdmin.createUser({
      email: loginEmail,
      password,
      email_confirm: true,
      user_metadata: { username: displayName, display_name: displayName },
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
        role: FACILITY_ROLES.includes(resolvedRole) ? resolvedRole : "viewer",
        is_active: true,
      })
      .select("id")
      .single();

    if (fuError) throw fuError;

    return NextResponse.json(
      {
        id: fuData?.id ?? userId,
        username: displayName,
        email: authData.user?.email ?? loginEmail,
      },
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
