/**
 * GET /api/tat/tests-level — paginated test_requests for TAT "Tests Level" tab (ENG-90).
 *
 * Zyntel-dashboard port note: aligns with Tracker / Tests table patterns (Nakasero). Related
 * zyntel pages: `Tracker.tsx`, `Tests.tsx`, `TAT.tsx` — Kanta consolidates operational TAT here.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireFacilityAccess, jsonError } from "@/lib/auth/server";
import { computeSampleDisplayToken } from "@/lib/tat/sampleDisplayToken";
import { computeTestsLevelStatus, tatMinutesBetween } from "@/lib/tat/testRequestStatus";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id")?.trim();
  const section = searchParams.get("section");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)), 100);

  if (!facilityId) {
    return jsonError("facility_id is required", 400);
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const accessErr = requireFacilityAccess(ctx, facilityId);
  if (accessErr) return accessErr;

  if (!supabaseConfigured) {
    return NextResponse.json({ rows: [], total: 0, page, limit });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();
    const offset = (page - 1) * limit;

    let q = db
      .from("test_requests")
      .select(
        "id, test_name, section, requested_at, received_at, resulted_at, status",
        { count: "exact" }
      )
      .eq("facility_id", facilityId)
      .neq("status", "cancelled")
      .order("requested_at", { ascending: false });

    if (section && section !== "all") {
      q = q.eq("section", section);
    }
    if (dateFrom) {
      q = q.gte("requested_at", dateFrom);
    }
    if (dateTo) {
      q = q.lte("requested_at", `${dateTo}T23:59:59.999Z`);
    }

    const { data: rows, error, count } = await q.range(offset, offset + limit - 1);
    if (error) throw error;

    const { data: targets } = await db
      .from("tat_targets")
      .select("section, test_name, target_minutes")
      .eq("facility_id", facilityId);

    const targetMap = new Map<string, number>();
    for (const t of targets ?? []) {
      const key = t.test_name ? `${t.section}:${t.test_name}` : t.section;
      targetMap.set(key, t.target_minutes);
    }

    const now = new Date();
    const payload = (rows ?? []).map((r) => {
      const target =
        targetMap.get(`${r.section}:${r.test_name}`) ??
        targetMap.get(r.section) ??
        60;
      const tatMin = tatMinutesBetween(r.received_at, r.resulted_at, now);
      const statusLabel = computeTestsLevelStatus({
        received_at: r.received_at,
        resulted_at: r.resulted_at,
        targetMinutes: target,
        now,
      });
      return {
        sample_display_token: computeSampleDisplayToken(facilityId, r.id),
        test_name: r.test_name,
        section: r.section,
        received_at: r.received_at,
        resulted_at: r.resulted_at,
        tat_minutes: tatMin,
        status: statusLabel,
      };
    });

    return NextResponse.json({
      rows: payload,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    console.error("[GET /api/tat/tests-level]", err);
    return NextResponse.json({ error: "Failed to load tests-level data" }, { status: 500 });
  }
}
