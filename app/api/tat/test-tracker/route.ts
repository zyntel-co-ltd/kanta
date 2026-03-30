/**
 * GET /api/tat/test-tracker — Test-level TAT tracker rows (one row per test_request / section-test).
 */

import { NextRequest, NextResponse } from "next/server";
import { maskLabNumber } from "@/lib/tat/maskLabNumber";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const section = searchParams.get("section");
  const testSearch = searchParams.get("test_name");
  /** When true, keep only rows whose `section` matches an active `lab_sections.code` (strict). Default off for legacy section labels. */
  const activeSectionsOnly = searchParams.get("active_sections_only") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "500", 10), 2000);

  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ data: [], activeSectionCodes: [] as string[] });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    let activeCodes: string[] = [];
    if (activeSectionsOnly) {
      const { data: secRows, error: secErr } = await db
        .from("lab_sections")
        .select("code")
        .eq("facility_id", facilityId)
        .eq("is_active", true);
      if (secErr) throw secErr;
      activeCodes = (secRows ?? []).map((r) => String(r.code).trim().toUpperCase()).filter(Boolean);
    }

    let query = db
      .from("test_requests")
      .select(
        "id, lab_number, test_name, section, status, requested_at, received_at, resulted_at, section_time_in, section_time_out"
      )
      .eq("facility_id", facilityId)
      .neq("status", "cancelled")
      .order("requested_at", { ascending: false })
      .limit(limit);

    if (dateFrom) query = query.gte("requested_at", dateFrom);
    if (dateTo) query = query.lte("requested_at", `${dateTo}T23:59:59.999Z`);
    if (section && section !== "all") query = query.eq("section", section);
    if (testSearch?.trim()) query = query.ilike("test_name", `%${testSearch.trim()}%`);

    const { data: rows, error } = await query;
    if (error) throw error;

    const { data: targets, error: tErr } = await db
      .from("tat_targets")
      .select("section, test_name, target_minutes")
      .eq("facility_id", facilityId);
    if (tErr) throw tErr;

    const targetMap = new Map<string, number>();
    for (const t of targets ?? []) {
      const key = t.test_name ? `${t.section}:${t.test_name}` : t.section;
      targetMap.set(key, t.target_minutes);
    }

    const codeSet = new Set(activeCodes);
    const filtered = (rows ?? []).filter((r) => {
      if (!activeSectionsOnly || codeSet.size === 0) return true;
      const c = String(r.section ?? "").trim().toUpperCase();
      return codeSet.has(c);
    });

    const data = filtered.map((r) => {
      const target =
        targetMap.get(`${r.section}:${r.test_name}`) ??
        targetMap.get(r.section) ??
        60;

      const timeInRaw = r.section_time_in ?? r.received_at;
      const timeOutRaw = r.section_time_out ?? r.resulted_at;

      return {
        id: r.id,
        lab_number_masked: maskLabNumber(r.lab_number),
        test_name: r.test_name,
        section: r.section,
        status: r.status,
        requested_at: r.requested_at,
        received_at: r.received_at,
        resulted_at: r.resulted_at,
        section_time_in: r.section_time_in,
        section_time_out: r.section_time_out,
        time_in: timeInRaw,
        time_out: timeOutRaw,
        target_minutes: target,
      };
    });

    return NextResponse.json({ data, activeSectionCodes: activeCodes });
  } catch (err) {
    console.error("[GET /api/tat/test-tracker]", err);
    return NextResponse.json({ error: "Failed to fetch test tracker" }, { status: 500 });
  }
}
