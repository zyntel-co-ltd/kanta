/**
 * GET  /api/v1/scans?hospital_id=xxx&limit=10   — recent scan events
 * POST /api/v1/scans                             — log a scan (PWA: works offline → sync on reconnect)
 */

import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, ScanEvent } from "@/types";
import { scanFeed } from "@/lib/data";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<ScanEvent[]>>> {
  const hospitalId = req.nextUrl.searchParams.get("hospital_id");
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "10");

  if (!hospitalId) {
    return NextResponse.json({ data: null, error: "hospital_id is required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    const mock = scanFeed.map((s) => ({
      id: String(s.id),
      equipment_id: `eq-${s.id}`,
      equipment: {
        id: `eq-${s.id}`,
        name: s.equipment,
        model: "",
        serial_number: "",
        qr_code: "",
        department_id: s.department,
        status: s.status as ScanEvent["status_at_scan"],
        last_scanned_at: null,
        last_scanned_by: null,
        location: s.location,
        next_maintenance_at: null,
        created_at: new Date().toISOString(),
        department: { id: s.department, name: s.department, hospital_id: hospitalId, created_at: "" },
      },
      scanned_by: s.scannedBy,
      status_at_scan: s.status as ScanEvent["status_at_scan"],
      location: s.location,
      notes: null,
      synced: true,
      created_at: new Date().toISOString(),
      hospital_id: hospitalId,
    }));

    return NextResponse.json({ data: mock.slice(0, limit) as unknown as ScanEvent[], error: null });
  }

  try {
    const { getRecentScans } = await import("@/lib/db");
    const scans = await getRecentScans(hospitalId, limit);
    return NextResponse.json({ data: scans, error: null });
  } catch (err) {
    console.error("[GET /api/v1/scans]", err);
    return NextResponse.json({ data: null, error: "Failed to fetch scans" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  try {
    const body = await req.json();
    const { equipment_id, hospital_id, scanned_by, status_at_scan, location, notes } = body;

    if (!equipment_id || !hospital_id || !scanned_by || !status_at_scan) {
      return NextResponse.json(
        { data: null, error: "equipment_id, hospital_id, scanned_by, status_at_scan are required" },
        { status: 400 }
      );
    }

    if (!supabaseConfigured) {
      return NextResponse.json({ data: { id: `mock-${Date.now()}` }, error: null });
    }

    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data, error } = await db
      .from("scan_events")
      .insert({
        equipment_id,
        hospital_id,
        scanned_by,
        status_at_scan,
        location: location ?? null,
        notes: notes ?? null,
        synced: true,
      })
      .select("id")
      .single();

    if (error) throw error;

    await db
      .from("equipment")
      .update({
        last_scanned_at: new Date().toISOString(),
        last_scanned_by: scanned_by,
        status: status_at_scan,
        location: location ?? null,
      })
      .eq("id", equipment_id);

    return NextResponse.json({ data: { id: data.id }, error: null }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/scans]", err);
    return NextResponse.json({ data: null, error: "Failed to log scan" }, { status: 500 });
  }
}
