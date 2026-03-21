/**
 * GET /api/qc/qualitative/entries — List qualitative QC entries
 * POST /api/qc/qualitative/entries — Create qualitative QC entry
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");
  const configId = searchParams.get("config_id");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ data: [] });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    let query = db
      .from("qualitative_qc_entries")
      .select("*, qualitative_qc_configs(test_name)")
      .eq("facility_id", facilityId)
      .order("run_at", { ascending: false })
      .limit(limit);

    if (configId) query = query.eq("config_id", configId);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("[GET /api/qc/qualitative/entries]", err);
    return NextResponse.json(
      { error: "Failed to fetch qualitative QC entries" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    facility_id,
    config_id,
    run_at,
    control_results,
    overall_pass,
    corrective_action,
    entered_by,
    submitted,
  } = body;

  if (!facility_id || !config_id || !run_at || !Array.isArray(control_results)) {
    return NextResponse.json(
      { error: "facility_id, config_id, run_at, control_results required" },
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
      .from("qualitative_qc_entries")
      .insert({
        facility_id,
        config_id,
        run_at,
        control_results,
        overall_pass: !!overall_pass,
        corrective_action: corrective_action?.trim() || null,
        entered_by: entered_by?.trim() || null,
        submitted: !!submitted,
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/qc/qualitative/entries]", err);
    return NextResponse.json(
      { error: "Failed to create qualitative QC entry" },
      { status: 500 }
    );
  }
}
