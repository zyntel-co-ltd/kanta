import { NextRequest, NextResponse } from "next/server";
import {
  getAuthContext,
  jsonError,
  requireFacilityAccess,
  requireWriteAccess,
} from "@/lib/auth/server";
import { computeSampleDisplayToken } from "@/lib/tat/sampleDisplayToken";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

type ReceptionRow = {
  id: string;
  visit_token: string | null;
  lab_number: string | null;
  test_name: string;
  section: string;
  requested_at: string | null;
  section_time_in: string | null;
  section_time_out: string | null;
  status: string;
  is_urgent?: boolean | null;
};

function tatMinutes(timeIn: string | null, timeOut: string | null): number | null {
  if (!timeIn || !timeOut) return null;
  const a = new Date(timeIn).getTime();
  const b = new Date(timeOut).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((b - a) / 60000));
}

function canEditWithin30Minutes(existingIso: string | null): boolean {
  if (!existingIso) return false;
  const ts = new Date(existingIso).getTime();
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= 30 * 60 * 1000;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id")?.trim();
  const section = searchParams.get("section")?.trim();
  const q = searchParams.get("q")?.trim().toLowerCase();
  const date = searchParams.get("date")?.trim() ?? new Date().toISOString().slice(0, 10);

  if (!facilityId) return jsonError("facility_id is required", 400);

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const accessErr = requireFacilityAccess(ctx, facilityId);
  if (accessErr) return accessErr;

  if (!supabaseConfigured) {
    return NextResponse.json({ rows: [] });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = `${date}T23:59:59.999Z`;

    let query = db
      .from("test_requests")
      .select(
        "id, visit_token, lab_number, test_name, section, requested_at, section_time_in, section_time_out, status, is_urgent"
      )
      .eq("facility_id", facilityId)
      .neq("status", "cancelled")
      .gte("requested_at", dayStart)
      .lte("requested_at", dayEnd)
      .order("requested_at", { ascending: false })
      .limit(500);

    if (section && section !== "all") query = query.eq("section", section);
    const { data, error } = await query;
    if (error) throw error;

    let rows = (data ?? []) as ReceptionRow[];
    if (q) {
      rows = rows.filter((r) => {
        return (
          (r.lab_number ?? "").toLowerCase().includes(q) ||
          r.test_name.toLowerCase().includes(q) ||
          r.section.toLowerCase().includes(q)
        );
      });
    }

    const payload = rows.map((r) => {
      const tokenBase = r.visit_token?.trim() || r.id;
      const patient_token = computeSampleDisplayToken(facilityId, tokenBase);
      return {
        ...r,
        patient_token,
        tat_minutes: tatMinutes(r.section_time_in, r.section_time_out),
      };
    });

    return NextResponse.json({ rows: payload });
  } catch (err) {
    console.error("[GET /api/tat/reception]", err);
    return jsonError("Failed to fetch reception rows", 500);
  }
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | {
        request_id?: string;
        field?: "section_time_in" | "section_time_out" | "is_urgent";
        value?: string | boolean;
        facility_id?: string;
      }
    | null;

  const requestId = body?.request_id?.trim();
  const field = body?.field;
  const facilityId = body?.facility_id?.trim();

  if (!requestId) return jsonError("request_id is required", 400);
  if (!facilityId) return jsonError("facility_id is required", 400);
  if (field !== "section_time_in" && field !== "section_time_out" && field !== "is_urgent") {
    return jsonError("field must be section_time_in, section_time_out, or is_urgent", 400);
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const accessErr = requireFacilityAccess(ctx, facilityId);
  if (accessErr) return accessErr;
  const writeErr = requireWriteAccess(ctx);
  if (writeErr) return writeErr;

  if (!supabaseConfigured) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: row, error: readErr } = await db
      .from("test_requests")
      .select("id, facility_id, section_time_in, section_time_out, is_urgent")
      .eq("id", requestId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!row) return jsonError("request_id not found", 404);
    if (row.facility_id !== facilityId) return jsonError("Forbidden", 403);

    let updatePayload: Record<string, unknown>;
    if (field === "is_urgent") {
      updatePayload = { is_urgent: body?.value === true || body?.value === "true" };
    } else {
      const value = typeof body?.value === "string" ? body.value.trim() : "";
      if (!value) return jsonError("value is required", 400);
      const when = new Date(value);
      if (Number.isNaN(when.getTime())) return jsonError("value must be a valid ISO timestamp", 400);
      const existingIso = field === "section_time_in" ? row.section_time_in : row.section_time_out;
      if (existingIso && !canEditWithin30Minutes(existingIso)) {
        return jsonError("Edit window expired (30 minutes)", 400);
      }
      updatePayload = { [field]: when.toISOString() };
    }

    const { data: updated, error: updateErr } = await db
      .from("test_requests")
      .update(updatePayload)
      .eq("id", requestId)
      .eq("facility_id", facilityId)
      .select(
        "id, visit_token, lab_number, test_name, section, requested_at, section_time_in, section_time_out, status, is_urgent"
      )
      .single();
    if (updateErr) throw updateErr;

    const payload = {
      ...updated,
      patient_token: computeSampleDisplayToken(facilityId, updated.visit_token?.trim() || updated.id),
      tat_minutes: tatMinutes(updated.section_time_in, updated.section_time_out),
    };
    return NextResponse.json({ row: payload });
  } catch (err) {
    console.error("[PATCH /api/tat/reception]", err);
    return jsonError("Failed to update reception", 500);
  }
}
