/**
 * GET /api/qc/qualitative/entries — List qualitative QC entries
 * POST /api/qc/qualitative/entries — Create qualitative QC entry
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/server";
import { writeAuditLog } from "@/lib/audit";

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
    rerun_for_entry_id,
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
    const isSubmitted = !!submitted;
    const isPass = !!overall_pass;
    const followupStatus =
      isSubmitted && !isPass && corrective_action?.trim()
        ? "open"
        : "none";

    let rerunForId: string | null = null;
    if (typeof rerun_for_entry_id === "string" && rerun_for_entry_id.trim()) {
      const candidateId = rerun_for_entry_id.trim();
      const { data: parentRow } = await db
        .from("qualitative_qc_entries")
        .select("id, facility_id, submitted, overall_pass")
        .eq("id", candidateId)
        .single();
      if (
        parentRow &&
        parentRow.facility_id === facility_id &&
        parentRow.submitted === true &&
        parentRow.overall_pass === false
      ) {
        rerunForId = candidateId;
      }
    }

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
        submitted: isSubmitted,
        rerun_for_entry_id: rerunForId,
        followup_status: followupStatus,
      })
      .select("id, overall_pass, submitted, rerun_for_entry_id, followup_status")
      .single();

    if (error) throw error;

    if (data?.rerun_for_entry_id && data.submitted) {
      const parentFollowupStatus = data.overall_pass ? "closed" : "open";
      await db
        .from("qualitative_qc_entries")
        .update({
          rerun_entry_id: data.id,
          followup_status: parentFollowupStatus,
          followup_closed_at: data.overall_pass ? new Date().toISOString() : null,
        })
        .eq("id", data.rerun_for_entry_id);
    }

    const ctx = await getAuthContext(req);
    await writeAuditLog({
      facilityId: facility_id,
      userId: ctx.user?.id ?? null,
      action: "qc.qual_entry.created",
      entityType: "qualitative_qc_entry",
      entityId: data.id,
      newValue: {
        config_id,
        run_at,
        overall_pass: isPass,
        submitted: isSubmitted,
        rerun_for_entry_id: rerunForId,
        followup_status: followupStatus,
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/qc/qualitative/entries]", err);
    return NextResponse.json(
      { error: "Failed to create qualitative QC entry" },
      { status: 500 }
    );
  }
}
