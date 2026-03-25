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

  const { data: { user } } = await supabase.auth.getUser();
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

  const { data: pa } = await db
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isSuperAdmin = !!pa;

  const { data: memberships } = await db
    .from("facility_users")
    .select("facility_id, role, is_active")
    .eq("user_id", user.id);

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

  const role =
    row?.role && isFacilityRole(row.role) ? row.role : null;

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
