import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth } from "@/lib/auth/server";
import { getPermissions } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase";

/**
 * GET /api/me — Current user, resolved facility, role, and permission flags
 */
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  const denied = requireAuth(ctx);
  if (denied) return denied;

  const perms = getPermissions(ctx.role, ctx.isSuperAdmin);
  let hospitalName: string | null = null;
  let hospitalLogoUrl: string | null = null;
  let subscriptionTier: string | null = null;

  if (ctx.facilityId) {
    try {
      const db = createAdminClient();
      const { data } = await db
        .from("hospitals")
        .select("name, logo_url, tier")
        .eq("id", ctx.facilityId)
        .maybeSingle();
      hospitalName = data?.name ?? null;
      hospitalLogoUrl = data?.logo_url ?? null;
      subscriptionTier = (data as { tier?: string | null } | null)?.tier ?? null;
    } catch {
      // Keep /api/me resilient; fall back to env values in UI.
    }
  }

  return NextResponse.json({
    user: ctx.user,
    facilityId: ctx.facilityId,
    hospitalName,
    hospitalLogoUrl,
    subscriptionTier,
    role: ctx.role,
    isSuperAdmin: ctx.isSuperAdmin,
    ...perms,
  });
}
