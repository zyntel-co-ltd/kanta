import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth } from "@/lib/auth/server";
import { getPermissions } from "@/lib/auth/roles";

/**
 * GET /api/me — Current user, resolved facility, role, and permission flags
 */
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  const denied = requireAuth(ctx);
  if (denied) return denied;

  const perms = getPermissions(ctx.role, ctx.isSuperAdmin);

  return NextResponse.json({
    user: ctx.user,
    facilityId: ctx.facilityId,
    role: ctx.role,
    isSuperAdmin: ctx.isSuperAdmin,
    ...perms,
  });
}
