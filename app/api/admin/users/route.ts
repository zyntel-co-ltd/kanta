/**
 * GET /api/admin/users — List facility users (admin panel only)
 * POST /api/admin/users — Create user with password (advanced; prefer invites)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAdminPanel } from "@/lib/auth/server";
import {
  FACILITY_ROLES,
  assignableFacilityRoles,
  facilityRoleLabel,
  isFacilityRole,
  type FacilityRole,
} from "@/lib/auth/roles";

function normalizeRole(value: unknown): FacilityRole {
  if (typeof value !== "string") return "viewer";
  const role = value.trim().toLowerCase();
  if (role === "admin") return "facility_admin";
  if (role === "manager") return "lab_manager";
  if (role === "technician" || role === "reception") return "lab_technician";
  if (role === "viewer") return "viewer";
  if (isFacilityRole(role)) return role;
  return "viewer";
}

type AuthUserMeta = {
  username?: string;
  display_name?: string;
  full_name?: string;
  name?: string;
  avatar_url?: string;
};

/**
 * ENG-104: display_name → full_name → name → email local-part. Never use user id or UUID fragments.
 * (Legacy `username` in metadata is not a display-name tier in the spec.)
 */
function resolveFullName(meta: AuthUserMeta | undefined, email: string): string {
  const d =
    (typeof meta?.display_name === "string" && meta.display_name.trim()) ||
    (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta?.name === "string" && meta.name.trim()) ||
    "";
  if (d) {
    const looksLikeUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(d);
    if (!looksLikeUuid) return d;
  }
  if (email && email.includes("@")) {
    return email.split("@")[0] ?? "User";
  }
  return "User";
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

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const denied = requireAdminPanel(ctx, facilityId);
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
    const metaById = new Map<string, AuthUserMeta>();
    const avatarById = new Map<string, string | null>();
    const lastLoginById = new Map<string, string | null>();
    const missingUserIds = new Set<string>();

    try {
      const listUsers = (db.auth as {
        admin?: {
          listUsers: (o: { page?: number; perPage?: number }) => Promise<{
            data?: {
              users?: Array<{
                id: string;
                email?: string;
                last_sign_in_at?: string;
                user_metadata?: AuthUserMeta;
              }>;
            };
          }>;
          getUserById?: (id: string) => Promise<{
            data?: {
              user?: {
                id: string;
                email?: string;
                last_sign_in_at?: string;
                user_metadata?: AuthUserMeta;
              };
            };
          }>;
        };
      }).admin;
      const getUserById = listUsers?.getUserById;
      const listUsersFn = listUsers?.listUsers;
      if (listUsersFn) {
        const { data: listData } = await listUsersFn({ page: 1, perPage: 1000 });
        for (const au of listData?.users ?? []) {
          emailById.set(au.id, au.email ?? "");
          metaById.set(au.id, au.user_metadata ?? {});
          if (au.user_metadata?.avatar_url) {
            avatarById.set(au.id, au.user_metadata.avatar_url);
          }
          if (au.last_sign_in_at) {
            lastLoginById.set(au.id, au.last_sign_in_at);
          }
        }
      }

      for (const u of facilityUsers ?? []) {
        const uid = String(u.user_id || "");
        if (!uid) continue;
        const listed = emailById.has(uid) && metaById.has(uid);
        const emailKnown = (emailById.get(uid) ?? "").trim().length > 0;
        // Not in first listUsers page, or listUsers returned no email (refetch canonical auth row).
        if (!listed || !emailKnown) missingUserIds.add(uid);
      }
      if (getUserById && missingUserIds.size > 0) {
        await Promise.all(
          Array.from(missingUserIds).map(async (uid) => {
            try {
              const { data } = await getUserById(uid);
              const au = data?.user;
              if (!au) return;
              if (au.email) emailById.set(uid, au.email);
              metaById.set(uid, au.user_metadata ?? {});
              if (au.user_metadata?.avatar_url) {
                avatarById.set(uid, au.user_metadata.avatar_url);
              }
              if (au.last_sign_in_at) {
                lastLoginById.set(uid, au.last_sign_in_at);
              }
            } catch {
              /* ignore */
            }
          })
        );
      }
    } catch {
      /* auth list optional */
    }

    const users = (facilityUsers ?? []).map((u) => {
      const uid = u.user_id as string;
      const email = emailById.get(uid) ?? "";
      const meta = metaById.get(uid);
      const role = normalizeRole(u.role);
      const full_name = resolveFullName(meta, email);
      return {
        id: u.id,
        user_id: uid,
        full_name,
        email,
        role,
        role_label: facilityRoleLabel(role),
        is_active: u.is_active ?? true,
        last_login: lastLoginById.get(uid) ?? null,
        created_at: u.created_at,
        avatar_url: avatarById.get(uid) ?? null,
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
  const denied = requireAdminPanel(ctx, facility_id);
  if (denied) return denied;

  const resolvedRole: FacilityRole = isFacilityRole(role) ? role : "viewer";
  const allowed = assignableFacilityRoles(ctx.role, ctx.isSuperAdmin);
  if (!allowed.includes(resolvedRole)) {
    return NextResponse.json({ error: "You cannot assign this role" }, { status: 403 });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const authAdmin = (db.auth as {
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
    }).admin;
    if (!authAdmin) throw new Error("Auth admin not available");
    const displayName = usernameTrim || loginEmail.split("@")[0] || "user";
    const { data: authData, error: authError } = await authAdmin.createUser({
      email: loginEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username: displayName,
        display_name: displayName,
        full_name: displayName,
      },
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
        full_name: displayName,
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
