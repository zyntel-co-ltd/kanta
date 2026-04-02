import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";
import type { FacilityRole } from "./roles";
import {
  ADMIN_USER_MANAGER_ROLES,
  REVENUE_ROLES,
  getPermissions,
  isFacilityRole,
} from "./roles";

function normalizeFacilityRole(value: unknown): FacilityRole | null {
  if (isFacilityRole(value)) return value;
  if (typeof value !== "string") return null;
  const vRaw = value.trim().toLowerCase();
  // Normalize separators so inputs like "lab technician", "lab-technician",
  // and "lab_technician" all match the same token.
  const v = vRaw.replace(/\s+/g, " ").replace(/[-_]+/g, " ");

  if (v === "facility admin" || v === "admin") return "facility_admin";
  if (v === "lab manager" || v === "manager") return "lab_manager";
  if (v === "lab technician" || v === "technician" || v === "reception")
    return "lab_technician";
  if (v === "viewer") return "viewer";

  return null;
}

function sanitizeEnv(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/^["']+|["']+$/g, "").trim();
}

const supabaseUrl = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) || "";
const anonKey =
  sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  "";

export type AuthContext = {
  user: { id: string; email?: string } | null;
  /** Resolved facility for this request (may differ from membership when super admin) */
  facilityId: string | null;
  role: FacilityRole | null;
  isSuperAdmin: boolean;
  isActive: boolean;
};

/**
 * ENG-160: Unmatched-tests admin APIs — super-admin, or deployments with
 * `NEXT_PUBLIC_FLAG_SHOW_UNMATCHED_TESTS=true` (aligns with `show-unmatched-tests` client flag).
 */
export function canAccessUnmatchedTestsApi(ctx: AuthContext): boolean {
  if (ctx.isSuperAdmin) return true;
  return process.env.NEXT_PUBLIC_FLAG_SHOW_UNMATCHED_TESTS === "true";
}

export async function getAuthContext(
  req: NextRequest,
  options?: { facilityIdHint?: string | null }
): Promise<AuthContext> {
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: () => {},
    },
  });

  const auth = supabase.auth as unknown as { getUser: () => Promise<{ data: { user: { id: string; email?: string } | null } }> };
  const { data: { user } } = await auth.getUser();
  if (!user) {
    return {
      user: null,
      facilityId: null,
      role: null,
      isSuperAdmin: false,
      isActive: false,
    };
  }

  const db = createAdminClient();

  // Run both lookups in parallel — cuts server-side auth latency roughly in half.
  const [{ data: pa }, { data: memberships }] = await Promise.all([
    db.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    db.from("facility_users").select("facility_id, role, is_active").eq("user_id", user.id),
  ]);

  const isSuperAdmin = !!pa;

  const facilityIdParam =
    req.nextUrl.searchParams.get("facility_id") ?? undefined;
  const headerFacility = req.headers.get("x-facility-id");
  const preferred =
    options?.facilityIdHint ||
    facilityIdParam ||
    headerFacility ||
    DEFAULT_FACILITY_ID;

  const rows = memberships ?? [];
  let row = rows.find(
    (m) => m.facility_id === preferred && m.is_active !== false
  );
  if (!row) {
    row = rows.find((m) => m.is_active !== false);
  }

  // Auto-provision facility membership for Supabase users created outside this app.
  // If the user has no rows in `facility_users`, treat them as an active `viewer` in the
  // default facility so the UI can load `/api/me` instead of returning 403.
  if (!isSuperAdmin && rows.length === 0) {
    try {
      await db.from("facility_users").upsert(
        {
          facility_id: preferred,
          user_id: user.id,
          role: "viewer",
          is_active: true,
        },
        { onConflict: "facility_id,user_id" }
      );
      const { data: membershipsAfter } = await db
        .from("facility_users")
        .select("facility_id, role, is_active")
        .eq("user_id", user.id);

      const rowsAfter = membershipsAfter ?? [];
      row =
        rowsAfter.find(
          (m) => m.facility_id === preferred && m.is_active !== false
        ) ?? rowsAfter.find((m) => m.is_active !== false);
    } catch {
      // If auto-provision fails (bad facility id, db error, etc) fall back to restricted.
    }
  }

  const role = normalizeFacilityRole(row?.role);

  if (isSuperAdmin) {
    return {
      user: { id: user.id, email: user.email },
      facilityId: preferred,
      role,
      isSuperAdmin: true,
      isActive: true,
    };
  }

  if (!row || row.is_active === false) {
    return {
      user: { id: user.id, email: user.email },
      facilityId: null,
      role: null,
      isSuperAdmin: false,
      isActive: false,
    };
  }

  return {
    user: { id: user.id, email: user.email },
    facilityId: row.facility_id as string,
    role,
    isSuperAdmin: false,
    isActive: true,
  };
}

/**
 * Who may access `/dashboard/admin/*` (user management, hospital admin UI).
 * Platform super-admins or facility_admins only — not lab_manager / technician / viewer.
 */
export async function userCanAccessAdminPanel(userId: string): Promise<boolean> {
  try {
    const db = createAdminClient();
    const { data: pa } = await db
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (pa) return true;

    const { data: memberships } = await db
      .from("facility_users")
      .select("role, is_active")
      .eq("user_id", userId);

    for (const m of memberships ?? []) {
      if (m.is_active === false) continue;
      if (normalizeFacilityRole(m.role) === "facility_admin") return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function requireAuth(ctx: AuthContext) {
  if (!ctx.user) {
    return jsonError("Unauthorized", 401);
  }
  if (!ctx.isSuperAdmin && !ctx.isActive) {
    return jsonError("Forbidden", 403);
  }
  return null;
}

export function requireFacilityAccess(
  ctx: AuthContext,
  facilityId: string
): NextResponse | null {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  if (ctx.isSuperAdmin) return null;

  if (ctx.facilityId !== facilityId) {
    return jsonError("Forbidden", 403);
  }
  return null;
}

export function requireFacilityRole(
  ctx: AuthContext,
  facilityId: string,
  allowed: FacilityRole[]
): NextResponse | null {
  const accessErr = requireFacilityAccess(ctx, facilityId);
  if (accessErr) return accessErr;

  if (ctx.isSuperAdmin) return null;

  if (!ctx.role || !allowed.includes(ctx.role)) {
    return jsonError("Forbidden", 403);
  }
  return null;
}

export function requireAdminUserManagement(
  ctx: AuthContext,
  facilityId: string
): NextResponse | null {
  return requireFacilityRole(ctx, facilityId, ADMIN_USER_MANAGER_ROLES);
}

/**
 * Admin panel APIs (/dashboard/admin): facility_admin or platform super admin only.
 * Lab managers must not call these routes (ENG-104 / ENG-105).
 */
export function requireAdminPanel(
  ctx: AuthContext,
  facilityId: string
): NextResponse | null {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;
  if (ctx.isSuperAdmin) return null;
  const perms = getPermissions(ctx.role, false);
  if (!perms.canAccessAdminPanel) {
    return jsonError("Forbidden", 403);
  }
  if (ctx.facilityId !== facilityId) {
    return jsonError("Forbidden", 403);
  }
  return null;
}

export function requireRevenueAccess(
  ctx: AuthContext,
  facilityId: string
): NextResponse | null {
  return requireFacilityRole(ctx, facilityId, REVENUE_ROLES);
}

export function requireWriteAccess(ctx: AuthContext): NextResponse | null {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const perms = getPermissions(ctx.role, ctx.isSuperAdmin);
  if (!perms.canWrite) {
    return jsonError("Forbidden", 403);
  }
  return null;
}
