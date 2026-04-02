/**
 * PATCH /api/qc/qualitative/entries/:id — Update a qualitative QC entry (e.g. submit draft)
 * DELETE /api/qc/qualitative/entries/:id — Delete a qualitative QC entry
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/server";
import { writeAuditLog } from "@/lib/audit";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();
    const { data: currentRow } = await db
      .from("qualitative_qc_entries")
      .select("id, facility_id, submitted, overall_pass, corrective_action, rerun_for_entry_id, followup_status")
      .eq("id", id)
      .single();

    if (!currentRow) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const nextSubmitted =
      body.submitted !== undefined ? !!body.submitted : !!currentRow.submitted;
    const nextOverallPass =
      body.overall_pass !== undefined ? !!body.overall_pass : !!currentRow.overall_pass;
    const nextCorrectiveAction =
      body.corrective_action !== undefined
        ? typeof body.corrective_action === "string"
          ? body.corrective_action
          : ""
        : currentRow.corrective_action ?? "";

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.run_at           !== undefined) updates.run_at            = body.run_at;
    if (body.control_results  !== undefined) updates.control_results   = body.control_results;
    if (body.overall_pass     !== undefined) updates.overall_pass      = body.overall_pass;
    if (body.corrective_action !== undefined) updates.corrective_action = body.corrective_action;
    if (body.entered_by       !== undefined) updates.entered_by        = body.entered_by;
    if (body.submitted        !== undefined) updates.submitted         = body.submitted;
    if (body.rerun_for_entry_id !== undefined) updates.rerun_for_entry_id = body.rerun_for_entry_id;
    if (body.followup_override_reason !== undefined) updates.followup_override_reason = body.followup_override_reason;

    if (body.followup_status === "override") {
      updates.followup_status = "override";
      updates.followup_closed_at = new Date().toISOString();
    } else {
      updates.followup_status =
        nextSubmitted && !nextOverallPass && nextCorrectiveAction.trim()
          ? "open"
          : "none";
      if (updates.followup_status !== "closed") {
        updates.followup_closed_at = null;
      }
    }

    const { error } = await db
      .from("qualitative_qc_entries")
      .update(updates)
      .eq("id", id);

    if (error) throw error;

    const rerunForId =
      body.rerun_for_entry_id !== undefined
        ? (typeof body.rerun_for_entry_id === "string" && body.rerun_for_entry_id.trim()
            ? body.rerun_for_entry_id.trim()
            : null)
        : (currentRow.rerun_for_entry_id ?? null);

    if (rerunForId && nextSubmitted) {
      await db
        .from("qualitative_qc_entries")
        .update({
          rerun_entry_id: id,
          followup_status: nextOverallPass ? "closed" : "open",
          followup_closed_at: nextOverallPass ? new Date().toISOString() : null,
        })
        .eq("id", rerunForId);
    }

    const ctx = await getAuthContext(req);
    await writeAuditLog({
      facilityId: currentRow.facility_id,
      userId: ctx.user?.id ?? null,
      action: "qc.qual_entry.updated",
      entityType: "qualitative_qc_entry",
      entityId: id,
      oldValue: {
        submitted: currentRow.submitted,
        overall_pass: currentRow.overall_pass,
        corrective_action: currentRow.corrective_action,
        rerun_for_entry_id: currentRow.rerun_for_entry_id,
        followup_status: currentRow.followup_status,
      },
      newValue: {
        submitted: nextSubmitted,
        overall_pass: nextOverallPass,
        corrective_action: nextCorrectiveAction,
        rerun_for_entry_id: rerunForId,
        followup_status: updates.followup_status,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/qc/qualitative/entries/:id]", err);
    return NextResponse.json(
      { error: "Failed to update entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { error } = await db
      .from("qualitative_qc_entries")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/qc/qualitative/entries/:id]", err);
    return NextResponse.json(
      { error: "Failed to delete entry" },
      { status: 500 }
    );
  }
}
