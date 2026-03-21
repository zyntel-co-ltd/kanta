/**
 * GET /api/qc/qualitative/configs — List qualitative QC configs
 * POST /api/qc/qualitative/configs — Create qualitative QC config
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");

  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ data: [] });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data, error } = await db
      .from("qualitative_qc_configs")
      .select("*")
      .eq("facility_id", facilityId)
      .order("test_name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("[GET /api/qc/qualitative/configs]", err);
    return NextResponse.json(
      { error: "Failed to fetch qualitative QC configs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    facility_id,
    test_name,
    result_type,
    lot_number,
    manufacturer,
    expiry_date,
    frequency,
    controls,
  } = body;

  if (!facility_id || !test_name || !Array.isArray(controls)) {
    return NextResponse.json(
      { error: "facility_id, test_name, controls required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ data: { id: "mock-1" } }, { status: 201 });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data, error } = await db
      .from("qualitative_qc_configs")
      .insert({
        facility_id,
        test_name: String(test_name).trim(),
        result_type: result_type || "Positive / Negative",
        lot_number: lot_number?.trim() || null,
        manufacturer: manufacturer?.trim() || null,
        expiry_date: expiry_date || null,
        frequency: frequency || "Daily",
        controls: controls,
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/qc/qualitative/configs]", err);
    return NextResponse.json(
      { error: "Failed to create qualitative QC config" },
      { status: 500 }
    );
  }
}
