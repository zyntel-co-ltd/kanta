/**
 * GET /api/lrids/data?facilityId=...&token=... — LRIDS rows (JWT-gated, no session).
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyLridsToken } from "@/lib/lrids/jwt";
import {
  calculateLridsProgress,
  type LridsProgressCssClass,
} from "@/lib/lrids/progressDisplay";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

function addMinutesIso(iso: string, minutes: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

export type LridsDataRow = {
  id: string;
  lab_number: string | null;
  test_name: string;
  section: string;
  section_label: string;
  status_text: string;
  status_css_class: LridsProgressCssClass;
  timestamp: string | null;
  updated_at: string | null;
};

export async function GET(req: NextRequest) {
  const facilityId = req.nextUrl.searchParams.get("facilityId")?.trim();
  const token = req.nextUrl.searchParams.get("token")?.trim();

  if (!facilityId || !token) {
    return NextResponse.json({ error: "facilityId and token are required" }, { status: 400 });
  }

  const ok = await verifyLridsToken(token, facilityId);
  if (!ok) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({
      hospital_name: null,
      hospital_logo_url: null,
      rows: [] as LridsDataRow[],
    });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceDay = since.toISOString().slice(0, 10);

    const [rowsRes, targetsRes, sectionsRes, hospRes] = await Promise.all([
      db
        .from("test_requests")
        .select("id, lab_number, test_name, section, status, requested_at, received_at, resulted_at")
        .eq("facility_id", facilityId)
        .neq("status", "cancelled")
        .gte("requested_at", sinceDay)
        .order("requested_at", { ascending: false })
        .limit(150),
      db.from("tat_targets").select("section, test_name, target_minutes").eq("facility_id", facilityId),
      db.from("lab_sections").select("code, name").eq("facility_id", facilityId),
      db.from("hospitals").select("name, logo_url").eq("id", facilityId).maybeSingle(),
    ]);

    if (rowsRes.error) throw rowsRes.error;

    const targetMap = new Map<string, number>();
    for (const t of targetsRes.data ?? []) {
      const key = t.test_name ? `${t.section}:${t.test_name}` : t.section;
      targetMap.set(key, t.target_minutes);
    }

    const sectionLabel = new Map<string, string>();
    for (const s of sectionsRes.data ?? []) {
      sectionLabel.set(String(s.code).trim().toUpperCase(), s.name);
    }

    const rows: LridsDataRow[] = (rowsRes.data ?? []).map((r) => {
      const target =
        targetMap.get(`${r.section}:${r.test_name}`) ??
        targetMap.get(r.section) ??
        60;

      const baseIso = r.received_at ?? r.requested_at;
      let timeExpected: string | null = null;
      if (baseIso) {
        const expected = addMinutesIso(baseIso, target);
        timeExpected = expected || null;
      }

      const timeOut =
        r.status === "resulted" && r.resulted_at ? String(r.resulted_at) : null;

      const prog = calculateLridsProgress(timeExpected, timeOut);
      const secKey = String(r.section ?? "").trim().toUpperCase();

      const updated = r.resulted_at ?? r.received_at ?? r.requested_at ?? null;
      return {
        id: r.id,
        lab_number: r.lab_number ?? null,
        test_name: r.test_name,
        section: r.section,
        section_label: sectionLabel.get(secKey) ?? r.section,
        status_text: prog.text,
        status_css_class: prog.cssClass,
        timestamp: r.requested_at ?? null,
        updated_at: updated,
      };
    });

    return NextResponse.json({
      hospital_name: hospRes.data?.name ?? null,
      hospital_logo_url: hospRes.data?.logo_url ?? null,
      rows,
    });
  } catch (err) {
    console.error("[GET /api/lrids/data]", err);
    return NextResponse.json({ error: "Failed to load LRIDS data" }, { status: 500 });
  }
}
