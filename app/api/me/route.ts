import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth } from "@/lib/auth/server";
import { getPermissions } from "@/lib/auth/roles";
import {
  applyPublicEnvFlagOverrides,
  emptyFacilityFlagsMap,
  mergeFacilityFlagsFromRows,
} from "@/lib/featureFlagCatalog";
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

  let groupId: string | null = null;
  let groupName: string | null = null;
  let branchName: string | null = null;
  let profileAvatarUrl: string | null = null;

  let flags = emptyFacilityFlagsMap();

  if (ctx.facilityId && ctx.user) {
    try {
      const db = createAdminClient();
      const { data: fuRow } = await db
        .from("facility_users")
        .select("avatar_url")
        .eq("user_id", ctx.user.id)
        .eq("facility_id", ctx.facilityId)
        .maybeSingle();
      profileAvatarUrl =
        typeof (fuRow as { avatar_url?: string } | null)?.avatar_url === "string"
          ? (fuRow as { avatar_url: string }).avatar_url.trim() || null
          : null;

      const { data } = await db
        .from("hospitals")
        .select("name, logo_url, tier, group_id, branch_name")
        .eq("id", ctx.facilityId)
        .maybeSingle();
      hospitalName = data?.name ?? null;
      hospitalLogoUrl = data?.logo_url ?? null;
      subscriptionTier = (data as { tier?: string | null } | null)?.tier ?? null;
      groupId = (data as { group_id?: string | null } | null)?.group_id ?? null;
      branchName = (data as { branch_name?: string | null } | null)?.branch_name ?? null;

      if (groupId) {
        const { data: g } = await db
          .from("hospital_groups")
          .select("name")
          .eq("id", groupId)
          .maybeSingle();
        groupName = (g as { name?: string } | null)?.name ?? null;
      }

      const { data: flagRows, error: flagErr } = await db
        .from("facility_flags")
        .select("flag_key, enabled")
        .eq("facility_id", ctx.facilityId);
      if (flagErr) {
        // PGRST205 = table not yet created (migration pending) — silently skip
        if ((flagErr as { code?: string }).code !== "PGRST205") {
          console.error("[GET /api/me] facility_flags:", flagErr.message);
        }
      } else {
        flags = mergeFacilityFlagsFromRows(flagRows);
      }
    } catch {
      // Keep /api/me resilient; fall back to env values in UI.
    }
  }

  flags = applyPublicEnvFlagOverrides(flags);

  return NextResponse.json({
    user: ctx.user,
    facilityId: ctx.facilityId,
    hospitalName,
    hospitalLogoUrl,
    subscriptionTier,
    groupId,
    groupName,
    branchName,
    profileAvatarUrl,
    role: ctx.role,
    isSuperAdmin: ctx.isSuperAdmin,
    flags,
    ...perms,
  });
}
