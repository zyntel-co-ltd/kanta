/**
 * GET /api/console/flags?facility_id= — flag state from `facility_flags` (super-admin only).
 * PATCH /api/console/flags — upsert or reset to tier defaults (super-admin only). ENG-161
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, jsonError } from "@/lib/auth/server";
import {
  getDefaultEnabledFlagsForTier,
  KANTA_FEATURE_FLAG_NAMES,
  mergeFacilityFlagsFromRows,
} from "@/lib/featureFlagCatalog";
import { createAdminClient } from "@/lib/supabase";

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
    const db = createAdminClient();
    const { data: hospital } = await db
      .from("hospitals")
      .select("tier")
      .eq("id", facilityId)
      .maybeSingle();

    const tier = (hospital as { tier?: string | null } | null)?.tier ?? null;

    const { data: rows, error: rErr } = await db
      .from("facility_flags")
      .select("flag_key, enabled")
      .eq("facility_id", facilityId);

    // PGRST205 = table not found (migration pending) — treat as no flags set yet
    if (rErr && (rErr as { code?: string }).code !== "PGRST205") throw rErr;

    const flags = mergeFacilityFlagsFromRows(rErr ? [] : rows);
    return NextResponse.json({
      posthogConfigured: false,
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

  const body = await req.json().catch(() => ({}));
  const facilityId = typeof body.facility_id === "string" ? body.facility_id.trim() : "";
  if (!facilityId) {
    return jsonError("facility_id is required", 400);
  }

  const db = createAdminClient();
  const userId = ctx.user.id;

  if (body.reset_defaults === true) {
    try {
      const { data: hospital } = await db
        .from("hospitals")
        .select("tier")
        .eq("id", facilityId)
        .maybeSingle();

      const tier = (hospital as { tier?: string | null } | null)?.tier ?? null;
      const defaults = getDefaultEnabledFlagsForTier(tier);
      const upsertRows = KANTA_FEATURE_FLAG_NAMES.map((flag_key) => ({
        facility_id: facilityId,
        flag_key,
        enabled: !!defaults[flag_key],
        updated_by: userId,
      }));

      const { error } = await db.from("facility_flags").upsert(upsertRows, {
        onConflict: "facility_id,flag_key",
      });
      if (error && (error as { code?: string }).code !== "PGRST205") throw error;

      const flags = mergeFacilityFlagsFromRows(
        KANTA_FEATURE_FLAG_NAMES.map((k) => ({ flag_key: k, enabled: !!defaults[k] }))
      );
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
    const { error: upErr } = await db.from("facility_flags").upsert(
      {
        facility_id: facilityId,
        flag_key: flagKey,
        enabled,
        updated_by: userId,
      },
      { onConflict: "facility_id,flag_key" }
    );
    // PGRST205 = table not found (migration pending) — acknowledge the request optimistically
    if (upErr && (upErr as { code?: string }).code !== "PGRST205") throw upErr;

    if (upErr) {
      // Table missing: return optimistic single-flag state (migration not yet applied)
      const flags = mergeFacilityFlagsFromRows([{ flag_key: flagKey, enabled }]);
      return NextResponse.json({ ok: true, flags });
    }

    const { data: rows, error: rErr } = await db
      .from("facility_flags")
      .select("flag_key, enabled")
      .eq("facility_id", facilityId);
    if (rErr && (rErr as { code?: string }).code !== "PGRST205") throw rErr;

    const flags = mergeFacilityFlagsFromRows(rErr ? [] : rows);
    return NextResponse.json({ ok: true, flags });
  } catch (e) {
    console.error("[PATCH /api/console/flags]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 }
    );
  }
}
