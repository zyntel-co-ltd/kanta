import { NextRequest, NextResponse } from "next/server";
import {
  getAuthContext,
  jsonError,
  requireFacilityAccess,
  requireWriteAccess,
} from "@/lib/auth/server";
import { parseTatQrPayload } from "@/lib/tat/qrPayload";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

type LookupRow = {
  id: string;
  facility_id: string;
  lab_number: string | null;
  test_name: string;
  section: string;
  status: string;
  requested_at: string | null;
  section_time_in: string | null;
  section_time_out: string | null;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id")?.trim();
  const qrRaw = searchParams.get("qr_payload")?.trim() ?? "";

  if (!facilityId) return jsonError("facility_id is required", 400);
  if (!qrRaw) return jsonError("qr_payload is required", 400);

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const accessErr = requireFacilityAccess(ctx, facilityId);
  if (accessErr) return accessErr;
  const writeErr = requireWriteAccess(ctx);
  if (writeErr) return writeErr;

  if (!supabaseConfigured) {
    return NextResponse.json({ candidates: [], notFound: true });
  }

  const payload = parseTatQrPayload(qrRaw);
  const decodedLab = payload.labNumber?.trim() ?? "";
  const decodedFacility = payload.facilityId?.trim() ?? null;

  if (!decodedLab) {
    return NextResponse.json({
      candidates: [],
      notFound: true,
      message: "Invalid QR payload. Could not decode lab number.",
    });
  }

  if (decodedFacility && decodedFacility !== facilityId) {
    return NextResponse.json({
      candidates: [],
      notFound: true,
      message: "This QR code belongs to a different facility.",
    });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data, error } = await db
      .from("test_requests")
      .select(
        "id, facility_id, lab_number, test_name, section, status, requested_at, section_time_in, section_time_out"
      )
      .eq("facility_id", facilityId)
      .eq("lab_number", decodedLab)
      .neq("status", "cancelled")
      .order("requested_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    const rows = (data ?? []) as LookupRow[];
    if (rows.length === 0) {
      return NextResponse.json({
        candidates: [],
        notFound: true,
        message: "No active test requests found for this sample.",
      });
    }

    const pending = rows.filter((r) => r.status !== "resulted" || !r.section_time_out);
    const sections = Array.from(
      new Set(
        pending
          .map((r) => r.section?.trim())
          .filter((s): s is string => !!s)
      )
    ).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      notFound: false,
      decoded: {
        lab_number: decodedLab,
        facility_id: decodedFacility,
      },
      patient: {
        lab_number: decodedLab,
        requested_at: rows[0]?.requested_at ?? null,
      },
      pending_sections: sections,
      candidates: rows,
    });
  } catch (err) {
    console.error("[GET /api/tat/scan]", err);
    return jsonError("Failed to scan lookup", 500);
  }
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | {
        facility_id?: string;
        request_id?: string;
        action?: "receive" | "result";
        timestamp_iso?: string | null;
      }
    | null;

  const facilityId = body?.facility_id?.trim();
  const requestId = body?.request_id?.trim();
  const action = body?.action;
  const nowIso =
    typeof body?.timestamp_iso === "string" && body.timestamp_iso.trim()
      ? body.timestamp_iso
      : new Date().toISOString();

  if (!facilityId) return jsonError("facility_id is required", 400);
  if (!requestId) return jsonError("request_id is required", 400);
  if (action !== "receive" && action !== "result") {
    return jsonError("action must be receive or result", 400);
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const accessErr = requireFacilityAccess(ctx, facilityId);
  if (accessErr) return accessErr;
  const writeErr = requireWriteAccess(ctx);
  if (writeErr) return writeErr;

  if (!supabaseConfigured) return NextResponse.json({ ok: true });

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: row, error: readErr } = await db
      .from("test_requests")
      .select("id, facility_id, status, section_time_in, section_time_out")
      .eq("id", requestId)
      .eq("facility_id", facilityId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!row) return jsonError("Test request not found", 404);

    const updates: Record<string, string> = {};
    if (action === "receive") {
      updates.section_time_in = nowIso;
      if (row.status === "pending") updates.status = "received";
    } else {
      updates.section_time_out = nowIso;
      if (!row.section_time_in) updates.section_time_in = nowIso;
      updates.status = "resulted";
    }

    const { error: updateErr } = await db
      .from("test_requests")
      .update(updates)
      .eq("id", requestId)
      .eq("facility_id", facilityId);
    if (updateErr) throw updateErr;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/tat/scan]", err);
    return jsonError("Failed to save section capture", 500);
  }
}
