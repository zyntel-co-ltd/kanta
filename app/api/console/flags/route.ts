/**
 * GET /api/console/flags?facility_id= — per-flag override state from PostHog (super-admin only).
 * PATCH /api/console/flags — set override or reset to tier defaults (super-admin only). ENG-158
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, jsonError } from "@/lib/auth/server";
import { KANTA_FEATURE_FLAG_NAMES } from "@/lib/featureFlagCatalog";
import {
  buildFlagStateForFacility,
  posthogManagementConfigured,
  resetFacilityFlagsToTierDefaults,
  setFacilityFlagOverride,
} from "@/lib/posthogConsoleApi";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

function isValidFlagKey(k: string): k is (typeof KANTA_FEATURE_FLAG_NAMES)[number] {
  return (KANTA_FEATURE_FLAG_NAMES as readonly string[]).includes(k);
}

export async function GET(req: NextRequest) {
  if (!supabaseConfigured) {
    return jsonError("Not configured", 503);
  }

  const ctx = await getAuthContext(req);
  if (!ctx.user) return jsonError("Unauthorized", 401);
  if (!ctx.isSuperAdmin) return jsonError("Forbidden", 403);

  const facilityId = req.nextUrl.searchParams.get("facility_id")?.trim();
  if (!facilityId) {
    return jsonError("facility_id is required", 400);
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();
    const { data: hospital } = await db
      .from("hospitals")
      .select("tier")
      .eq("id", facilityId)
      .maybeSingle();

    const tier = (hospital as { tier?: string | null } | null)?.tier ?? null;

    if (!posthogManagementConfigured()) {
      const flags: Record<string, boolean> = {};
      for (const name of KANTA_FEATURE_FLAG_NAMES) {
        flags[name] = false;
      }
      return NextResponse.json({
        posthogConfigured: false,
        tier,
        flags,
      });
    }

    const flags = await buildFlagStateForFacility(facilityId);
    return NextResponse.json({
      posthogConfigured: true,
      tier,
      flags,
    });
  } catch (e) {
    console.error("[GET /api/console/flags]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load flags" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (!supabaseConfigured) {
    return jsonError("Not configured", 503);
  }

  const ctx = await getAuthContext(req);
  if (!ctx.user) return jsonError("Unauthorized", 401);
  if (!ctx.isSuperAdmin) return jsonError("Forbidden", 403);

  if (!posthogManagementConfigured()) {
    return jsonError(
      "PostHog API credentials not configured. Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID.",
      503
    );
  }

  const body = await req.json().catch(() => ({}));
  const facilityId = typeof body.facility_id === "string" ? body.facility_id.trim() : "";
  if (!facilityId) {
    return jsonError("facility_id is required", 400);
  }

  if (body.reset_defaults === true) {
    try {
      const { createAdminClient } = await import("@/lib/supabase");
      const db = createAdminClient();
      const { data: hospital } = await db
        .from("hospitals")
        .select("tier")
        .eq("id", facilityId)
        .maybeSingle();

      const tier = (hospital as { tier?: string | null } | null)?.tier ?? null;
      await resetFacilityFlagsToTierDefaults(facilityId, tier);
      const flags = await buildFlagStateForFacility(facilityId);
      return NextResponse.json({ ok: true, tier, flags });
    } catch (e) {
      console.error("[PATCH /api/console/flags reset]", e);
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Reset failed" },
        { status: 500 }
      );
    }
  }

  const flagKey = typeof body.flag_key === "string" ? body.flag_key.trim() : "";
  const enabled = typeof body.enabled === "boolean" ? body.enabled : null;

  if (!flagKey || enabled === null) {
    return jsonError("flag_key (string) and enabled (boolean) are required unless reset_defaults is true", 400);
  }

  if (!isValidFlagKey(flagKey)) {
    return jsonError("Invalid flag_key", 400);
  }

  try {
    await setFacilityFlagOverride(flagKey, facilityId, enabled);
    const flags = await buildFlagStateForFacility(facilityId);
    return NextResponse.json({ ok: true, flags });
  } catch (e) {
    console.error("[PATCH /api/console/flags]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 }
    );
  }
}
