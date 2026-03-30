/**
 * GET /api/test-requests/lookup?barcode=...&facility_id=...
 *
 * ENG-90: Facility-scoped barcode / lab number lookup for sample result status (no PII in response).
 *
 * Expected barcode formats (Nakasero / typical LIMS — varies by site):
 * - Numeric or alphanumeric specimen IDs (often 6–20 chars), sometimes with a letter prefix (e.g. ACC12345).
 * - Code128 / QR payloads often contain the raw specimen accession or barcode string as stored in LIMS.
 * - We match against `test_requests.barcode` (preferred) and `test_requests.lab_number` as fallback.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireFacilityAccess, jsonError } from "@/lib/auth/server";
import { tatMinutesBetween } from "@/lib/tat/testRequestStatus";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("barcode");
  const barcode = typeof raw === "string" ? raw.trim() : "";
  const facilityId = searchParams.get("facility_id")?.trim();

  if (!barcode) {
    return jsonError("barcode is required", 400);
  }
  if (!facilityId) {
    return jsonError("facility_id is required", 400);
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const accessErr = requireFacilityAccess(ctx, facilityId);
  if (accessErr) return accessErr;

  if (!supabaseConfigured) {
    return NextResponse.json({ matches: [] });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: targets } = await db
      .from("tat_targets")
      .select("section, test_name, target_minutes")
      .eq("facility_id", facilityId);

    const targetMap = new Map<string, number>();
    for (const t of targets ?? []) {
      const key = t.test_name ? `${t.section}:${t.test_name}` : t.section;
      targetMap.set(key, t.target_minutes);
    }

    const selectCols =
      "id, test_name, section, status, requested_at, received_at, resulted_at, barcode, lab_number";

    const [{ data: byBarcode }, { data: byLab }] = await Promise.all([
      db
        .from("test_requests")
        .select(selectCols)
        .eq("facility_id", facilityId)
        .neq("status", "cancelled")
        .eq("barcode", barcode)
        .limit(25),
      db
        .from("test_requests")
        .select(selectCols)
        .eq("facility_id", facilityId)
        .neq("status", "cancelled")
        .eq("lab_number", barcode)
        .limit(25),
    ]);

    type ReqRow = {
      id: string;
      test_name: string;
      section: string;
      status: string;
      requested_at: string | null;
      received_at: string | null;
      resulted_at: string | null;
      barcode: string | null;
      lab_number: string | null;
    };

    const byId = new Map<string, ReqRow>();
    for (const r of [...(byBarcode ?? []), ...(byLab ?? [])] as ReqRow[]) {
      if (r?.id) byId.set(r.id, r);
    }
    const rows = Array.from(byId.values());
    const now = new Date();

    const matches = rows.map((r) => {
      const target =
        targetMap.get(`${r.section}:${r.test_name}`) ?? targetMap.get(r.section) ?? 60;
      let expected_result_at: string | null = null;
      if (r.received_at) {
        const d = new Date(r.received_at);
        if (!Number.isNaN(d.getTime())) {
          d.setMinutes(d.getMinutes() + target);
          expected_result_at = d.toISOString();
        }
      }
      const tat_so_far_minutes = tatMinutesBetween(r.received_at, r.resulted_at, now);
      return {
        section: r.section,
        test_name: r.test_name,
        received_at: r.received_at,
        expected_result_at,
        current_status: r.status,
        tat_so_far_minutes,
      };
    });

    return NextResponse.json({ matches });
  } catch (err) {
    console.error("[GET /api/test-requests/lookup]", err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
