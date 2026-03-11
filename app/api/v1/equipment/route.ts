/**
 * GET  /api/v1/equipment?hospital_id=xxx&status=operational&department_id=xxx
 * POST /api/v1/equipment  — register new equipment
 */

import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, Equipment } from "@/types";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<Equipment[]>>> {
  const hospitalId = req.nextUrl.searchParams.get("hospital_id");
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const departmentId = req.nextUrl.searchParams.get("department_id") ?? undefined;

  if (!hospitalId) {
    return NextResponse.json({ data: null, error: "hospital_id is required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ data: [], error: null });
  }

  try {
    const { getEquipment } = await import("@/lib/db");
    const equipment = await getEquipment(hospitalId, { status, department_id: departmentId });
    return NextResponse.json({ data: equipment, error: null });
  } catch (err) {
    console.error("[GET /api/v1/equipment]", err);
    return NextResponse.json({ data: null, error: "Failed to fetch equipment" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{ id: string; qr_code: string }>>> {
  try {
    const body = await req.json();
    const { name, model, serial_number, department_id, hospital_id, category, location, next_maintenance_at } = body;

    if (!name || !hospital_id || !department_id) {
      return NextResponse.json(
        { data: null, error: "name, hospital_id, and department_id are required" },
        { status: 400 }
      );
    }

    const qrCode = `KNT-${String(hospital_id).slice(0, 8).toUpperCase()}-${Date.now()}`;

    if (!supabaseConfigured) {
      return NextResponse.json(
        { data: { id: `mock-${Date.now()}`, qr_code: qrCode }, error: null },
        { status: 201 }
      );
    }

    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data, error } = await db
      .from("equipment")
      .insert({
        name,
        model: model ?? null,
        serial_number: serial_number ?? null,
        department_id,
        hospital_id,
        category: category ?? "Other",
        location: location ?? null,
        qr_code: qrCode,
        status: "operational",
        next_maintenance_at: next_maintenance_at ?? null,
      })
      .select("id, qr_code")
      .single();

    if (error) throw error;
    return NextResponse.json({ data: { id: data.id, qr_code: data.qr_code }, error: null }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/equipment]", err);
    return NextResponse.json({ data: null, error: "Failed to create equipment" }, { status: 500 });
  }
}
