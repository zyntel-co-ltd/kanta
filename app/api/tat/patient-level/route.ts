/**
 * GET /api/tat/patient-level — visit-grouped test_requests for TAT "Patient Level" tab (ENG-90).
 * Groups by `visit_token` when set; otherwise by `lab_number` (observation-layer fallback).
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getAuthContext, requireFacilityAccess, jsonError } from "@/lib/auth/server";
import { tatMinutesBetween } from "@/lib/tat/testRequestStatus";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

const MAX_ROWS = 800;

function visitGroupKey(row: {
  visit_token?: string | null;
  lab_number?: string | null;
  id: string;
}): string {
  const v = row.visit_token?.trim();
  if (v) return `vt:${v}`;
  const lab = row.lab_number?.trim();
  if (lab) return `ln:${lab}`;
  const secret = process.env.TAT_SAMPLE_TOKEN_SECRET?.trim() || "kanta-fallback";
  return `id:${createHash("sha256").update(`${secret}:${row.id}`).digest("hex").slice(0, 16)}`;
}

/** Opaque token shown in UI — not reversible to patient or sample id without DB. */
function visitDisplayToken(facilityId: string, groupKey: string): string {
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id")?.trim();
  const section = searchParams.get("section");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") ?? "15", 10)), 50);

  if (!facilityId) {
    return jsonError("facility_id is required", 400);
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const accessErr = requireFacilityAccess(ctx, facilityId);
  if (accessErr) return accessErr;

  if (!supabaseConfigured) {
    return NextResponse.json({ groups: [], total: 0, page, limit });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    let q = db
      .from("test_requests")
      .select(
        "id, test_name, section, requested_at, received_at, resulted_at, status, visit_token, lab_number"
      )
      .eq("facility_id", facilityId)
      .neq("status", "cancelled")
      .order("requested_at", { ascending: false })
      .limit(MAX_ROWS);

    if (section && section !== "all") {
      q = q.eq("section", section);
    }
    if (dateFrom) {
      q = q.gte("requested_at", dateFrom);
    }
    if (dateTo) {
      q = q.lte("requested_at", `${dateTo}T23:59:59.999Z`);
    }

    const { data: rows, error } = await q;
    if (error) throw error;

    type GroupAgg = {
      key: string;
      tests: { test_name: string; section: string; status: string; received_at: string | null; resulted_at: string | null }[];
      firstReceived: number | null;
      lastResulted: number | null;
    };

    const groups = new Map<string, GroupAgg>();
    for (const r of rows ?? []) {
      const key = visitGroupKey(r);
      let g = groups.get(key);
      if (!g) {
        g = { key, tests: [], firstReceived: null, lastResulted: null };
        groups.set(key, g);
      }
      g.tests.push({
        test_name: r.test_name,
        section: r.section,
        status: r.status,
        received_at: r.received_at,
        resulted_at: r.resulted_at,
      });
      if (r.received_at) {
        const t = new Date(r.received_at).getTime();
        if (!Number.isNaN(t)) {
          g.firstReceived = g.firstReceived == null ? t : Math.min(g.firstReceived, t);
        }
      }
      if (r.resulted_at && r.status === "resulted") {
        const t = new Date(r.resulted_at).getTime();
        if (!Number.isNaN(t)) {
          g.lastResulted = g.lastResulted == null ? t : Math.max(g.lastResulted, t);
        }
      }
    }

    const list = Array.from(groups.values()).map((g) => {
      const visitTatMin =
        g.firstReceived != null && g.lastResulted != null
          ? Math.max(0, Math.floor((g.lastResulted - g.firstReceived) / 60_000))
          : null;
      const allResulted = g.tests.length > 0 && g.tests.every((t) => t.status === "resulted");
      return {
        visit_display_token: visitDisplayToken(facilityId, g.key),
        test_count: g.tests.length,
        tests: g.tests,
        visit_tat_minutes: visitTatMin,
        visit_status: allResulted ? "Complete" : "Open",
        first_received_at:
          g.firstReceived != null ? new Date(g.firstReceived).toISOString() : null,
        last_resulted_at: g.lastResulted != null ? new Date(g.lastResulted).toISOString() : null,
      };
    });

    list.sort((a, b) => {
      const ta = a.first_received_at ? new Date(a.first_received_at).getTime() : 0;
      const tb = b.first_received_at ? new Date(b.first_received_at).getTime() : 0;
      return tb - ta;
    });

    const total = list.length;
    const offset = (page - 1) * limit;
    const pageRows = list.slice(offset, offset + limit);

    return NextResponse.json({
      groups: pageRows,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error("[GET /api/tat/patient-level]", err);
    return NextResponse.json({ error: "Failed to load patient-level data" }, { status: 500 });
  }
}
