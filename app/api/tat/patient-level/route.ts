/**
 * GET /api/tat/patient-level — patient-level live tracker rows + performance aggregates.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getAuthContext, requireFacilityAccess, jsonError } from "@/lib/auth/server";
import { maskLabNumber } from "@/lib/tat/maskLabNumber";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

const MAX_ROWS = 3000;

type RawRow = {
  id: string;
  lab_number: string | null;
  test_name: string;
  section: string;
  status: string;
  requested_at: string | null;
  received_at: string | null;
  resulted_at: string | null;
  section_time_in: string | null;
  section_time_out: string | null;
  visit_token: string | null;
};

type TargetRow = {
  section: string;
  test_name: string | null;
  target_minutes: number;
};

function patientGroupKey(row: RawRow): string {
  const v = row.visit_token?.trim();
  if (v) return `vt:${v}`;
  const lab = row.lab_number?.trim();
  if (lab) return `ln:${lab}`;
  const secret = process.env.TAT_SAMPLE_TOKEN_SECRET?.trim() || "kanta-fallback";
  return `id:${createHash("sha256").update(`${secret}:${row.id}`).digest("hex").slice(0, 16)}`;
}

function patientDisplayToken(facilityId: string, groupKey: string): string {
  const secret = (
    process.env.TAT_SAMPLE_TOKEN_SECRET?.trim() ||
    process.env.FACILITY_HASH_SALT?.trim() ||
    "kanta-dev-tat-sample-token"
  ).trim();
  return createHash("sha256")
    .update(`${secret}:${facilityId}:${groupKey}`)
    .digest("hex")
    .slice(0, 14)
    .toUpperCase();
}

function dateOnly(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  return Number.isFinite(d) ? d : null;
}

type GroupRow = {
  id: string;
  lab_number_display: string;
  tests_requested: string[];
  sections: string[];
  time_in: string | null;
  time_out: string | null;
  target_tat_minutes: number;
  requested_at: string | null;
};

function buildGroupRows(
  facilityId: string,
  rows: RawRow[],
  targetMap: Map<string, number>
): GroupRow[] {
  const groups = new Map<string, RawRow[]>();
  for (const r of rows) {
    const k = patientGroupKey(r);
    const arr = groups.get(k);
    if (arr) arr.push(r);
    else groups.set(k, [r]);
  }

  const out: GroupRow[] = [];
  for (const [key, grp] of groups.entries()) {
    const tests = Array.from(new Set(grp.map((r) => r.test_name).filter(Boolean)));
    const sections = Array.from(new Set(grp.map((r) => r.section).filter(Boolean)));
    const requestedAt = grp
      .map((r) => r.requested_at)
      .filter((x): x is string => !!x)
      .sort()[0] ?? null;
    const labRaw = grp.find((r) => !!r.lab_number)?.lab_number ?? null;
    const display =
      labRaw && labRaw.trim()
        ? maskLabNumber(labRaw, requestedAt)
        : patientDisplayToken(facilityId, key);

    const withDur = grp.map((r) => {
      const timeIn = r.section_time_in ?? r.received_at;
      const timeOut = r.section_time_out ?? r.resulted_at;
      const inMs = toMs(timeIn);
      const outMs = toMs(timeOut);
      const elapsed = inMs != null && outMs != null ? Math.max(0, Math.floor((outMs - inMs) / 60_000)) : null;
      const target =
        targetMap.get(`${r.section}:${r.test_name}`) ??
        targetMap.get(r.section) ??
        60;
      return { r, timeIn, timeOut, elapsed, target };
    });

    const firstTimeIn = withDur
      .map((x) => x.timeIn)
      .filter((x): x is string => !!x)
      .sort()[0] ?? null;

    const completed = withDur.filter((x) => x.elapsed != null);
    const multiDay = completed.filter((x) => (x.elapsed ?? 0) > 1440);

    let selectedOut: string | null = null;
    let selectedTarget = 60;
    if (multiDay.length > 0) {
      // zyntel parity: when multi-day tests exist, use shortest multi-day completion.
      multiDay.sort((a, b) => (a.elapsed ?? 0) - (b.elapsed ?? 0));
      selectedOut = multiDay[0].timeOut ?? null;
      selectedTarget = multiDay[0].target;
    } else if (completed.length > 0) {
      // all same-day completed: use longest test completion.
      completed.sort((a, b) => (b.elapsed ?? 0) - (a.elapsed ?? 0));
      selectedOut = completed[0].timeOut ?? null;
      selectedTarget = completed[0].target;
    } else {
      // still in progress: use highest target as conservative patient threshold.
      selectedTarget = Math.max(...withDur.map((x) => x.target), 60);
    }

    out.push({
      id: patientDisplayToken(facilityId, key),
      lab_number_display: display,
      tests_requested: tests,
      sections,
      time_in: firstTimeIn,
      time_out: selectedOut,
      target_tat_minutes: selectedTarget,
      requested_at: requestedAt,
    });
  }
  return out;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id")?.trim();
  const section = searchParams.get("section");
  const status = searchParams.get("status");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)), 200);

  if (!facilityId) return jsonError("facility_id is required", 400);

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const accessErr = requireFacilityAccess(ctx, facilityId);
  if (accessErr) return accessErr;

  if (!supabaseConfigured) {
    return NextResponse.json({
      rows: [],
      total: 0,
      page,
      limit,
      performance: { by_section: [], by_test: [], by_day: [] },
    });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    let q = db
      .from("test_requests")
      .select(
        "id, lab_number, test_name, section, status, requested_at, received_at, resulted_at, section_time_in, section_time_out, visit_token"
      )
      .eq("facility_id", facilityId)
      .neq("status", "cancelled")
      .order("requested_at", { ascending: false })
      .limit(MAX_ROWS);

    if (section && section !== "all") q = q.eq("section", section);
    if (dateFrom) q = q.gte("requested_at", dateFrom);
    if (dateTo) q = q.lte("requested_at", `${dateTo}T23:59:59.999Z`);

    const [{ data: rows, error }, { data: targets }] = await Promise.all([
      q,
      db.from("tat_targets").select("section, test_name, target_minutes").eq("facility_id", facilityId),
    ]);
    if (error) throw error;

    const targetMap = new Map<string, number>();
    for (const t of (targets ?? []) as TargetRow[]) {
      const key = t.test_name ? `${t.section}:${t.test_name}` : t.section;
      targetMap.set(key, t.target_minutes);
    }

    const groupRows = buildGroupRows(facilityId, (rows ?? []) as RawRow[], targetMap);

    const { computeTatPatientStatus } = await import("@/lib/tat/patientStatus");
    const now = new Date();
    const enriched = groupRows.map((r) => {
      const st = computeTatPatientStatus({
        now,
        timeIn: r.time_in ? new Date(r.time_in) : null,
        timeOut: r.time_out ? new Date(r.time_out) : null,
        targetMinutes: r.target_tat_minutes,
      });
      return { ...r, status_kind: st.kind, status_label: st.label, sort_score: st.sortScore, elapsed_minutes: st.elapsedMinutes };
    });

    const statusFiltered =
      status && status !== "all"
        ? enriched.filter((r) => r.status_kind === status)
        : enriched;

    statusFiltered.sort((a, b) => b.sort_score - a.sort_score);

    const total = statusFiltered.length;
    const offset = (page - 1) * limit;
    const pageRows = statusFiltered.slice(offset, offset + limit);

    // Lightweight performance rollups for charts under live table.
    const bySectionMap = new Map<string, { elapsedSum: number; count: number }>();
    const byTestMap = new Map<string, { elapsedSum: number; count: number }>();
    const byDayMap = new Map<string, { elapsedSum: number; count: number }>();
    for (const r of enriched) {
      if (r.elapsed_minutes == null) continue;
      for (const s of r.sections) {
        const cur = bySectionMap.get(s) ?? { elapsedSum: 0, count: 0 };
        cur.elapsedSum += r.elapsed_minutes;
        cur.count += 1;
        bySectionMap.set(s, cur);
      }
      for (const t of r.tests_requested) {
        const cur = byTestMap.get(t) ?? { elapsedSum: 0, count: 0 };
        cur.elapsedSum += r.elapsed_minutes;
        cur.count += 1;
        byTestMap.set(t, cur);
      }
      const day = dateOnly(r.requested_at);
      if (day) {
        const cur = byDayMap.get(day) ?? { elapsedSum: 0, count: 0 };
        cur.elapsedSum += r.elapsed_minutes;
        cur.count += 1;
        byDayMap.set(day, cur);
      }
    }

    const performance = {
      by_section: Array.from(bySectionMap.entries()).map(([sectionName, v]) => ({
        section: sectionName,
        avg_tat_minutes: Math.round(v.elapsedSum / Math.max(1, v.count)),
        count: v.count,
      })),
      by_test: Array.from(byTestMap.entries()).map(([testName, v]) => ({
        test_name: testName,
        avg_tat_minutes: Math.round(v.elapsedSum / Math.max(1, v.count)),
        count: v.count,
      })),
      by_day: Array.from(byDayMap.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([day, v]) => ({
          day,
          avg_tat_minutes: Math.round(v.elapsedSum / Math.max(1, v.count)),
          count: v.count,
        })),
    };

    return NextResponse.json({
      rows: pageRows,
      total,
      page,
      limit,
      performance,
    });
  } catch (err) {
    console.error("[GET /api/tat/patient-level]", err);
    return NextResponse.json({ error: "Failed to load patient-level data" }, { status: 500 });
  }
}
