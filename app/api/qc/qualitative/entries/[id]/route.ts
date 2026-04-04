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
      .select(
        "id, facility_id, submitted, overall_pass, corrective_action, rerun_for_entry_id, followup_status, followup_closed_at, followup_override_reason"
      )
      .eq("id", id)
      .single();

    if (!currentRow) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const ctx = await getAuthContext(req);

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

    let validatedRerunForId: string | null | undefined = undefined;
    if (body.rerun_for_entry_id !== undefined) {
      const raw = body.rerun_for_entry_id;
      if (raw === null || raw === "") {
        validatedRerunForId = null;
      } else if (typeof raw === "string" && raw.trim()) {
        const candidateId = raw.trim();
        const { data: parentRow } = await db
          .from("qualitative_qc_entries")
          .select("id, facility_id, submitted, overall_pass")
          .eq("id", candidateId)
          .single();
        if (
          parentRow &&
          parentRow.facility_id === currentRow.facility_id &&
          parentRow.submitted === true &&
          parentRow.overall_pass === false
        ) {
          validatedRerunForId = candidateId;
        } else {
          return NextResponse.json(
            { error: "rerun_for_entry_id must reference a submitted failed run in this facility" },
            { status: 400 }
          );
        }
      } else {
        validatedRerunForId = null;
      }
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.run_at !== undefined) updates.run_at = body.run_at;
    if (body.control_results !== undefined) updates.control_results = body.control_results;
    if (body.overall_pass !== undefined) updates.overall_pass = body.overall_pass;
    if (body.corrective_action !== undefined) updates.corrective_action = body.corrective_action;
    if (body.entered_by !== undefined) updates.entered_by = body.entered_by;
    if (body.submitted !== undefined) updates.submitted = body.submitted;
    if (validatedRerunForId !== undefined) updates.rerun_for_entry_id = validatedRerunForId;

    const isOverride = body.followup_status === "override";
    if (isOverride) {
      if (!currentRow.submitted || currentRow.overall_pass) {
        return NextResponse.json(
          { error: "Manual closure applies only to submitted failed QC runs" },
          { status: 400 }
        );
      }
      const reason =
        typeof body.followup_override_reason === "string" ? body.followup_override_reason.trim() : "";
      if (!reason) {
        return NextResponse.json(
          { error: "followup_override_reason is required for manual closure" },
          { status: 400 }
        );
      }
      updates.followup_status = "override";
      updates.followup_closed_at = new Date().toISOString();
      updates.followup_override_reason = reason;
    } else {
      if (body.followup_override_reason !== undefined && !isOverride) {
        return NextResponse.json(
          { error: "followup_override_reason may only be set when followup_status is override" },
          { status: 400 }
        );
      }
      const prior = currentRow.followup_status ?? "none";
      if (prior === "closed" || prior === "override") {
        updates.followup_status = prior;
        updates.followup_closed_at = currentRow.followup_closed_at;
      } else {
        updates.followup_status =
          nextSubmitted && !nextOverallPass && nextCorrectiveAction.trim()
            ? "open"
            : "none";
        if (updates.followup_status !== "closed") {
          updates.followup_closed_at = null;
        }
      }
    }

    const { error } = await db
      .from("qualitative_qc_entries")
      .update(updates)
      .eq("id", id);

    if (error) throw error;

    const effectiveRerunForId =
      validatedRerunForId !== undefined
        ? validatedRerunForId
        : (currentRow.rerun_for_entry_id ?? null);

    if (effectiveRerunForId && nextSubmitted && !isOverride) {
      const { data: parentBefore, error: parentLoadErr } = await db
        .from("qualitative_qc_entries")
        .select("followup_status, rerun_entry_id, followup_closed_at")
        .eq("id", effectiveRerunForId)
        .single();
      if (parentLoadErr) throw parentLoadErr;

      const parentFollowupStatus = nextOverallPass ? "closed" : "open";
      const parentClosedAt = nextOverallPass ? new Date().toISOString() : null;
      const { error: parentUpdErr } = await db
        .from("qualitative_qc_entries")
        .update({
          rerun_entry_id: id,
          followup_status: parentFollowupStatus,
          followup_closed_at: parentClosedAt,
        })
        .eq("id", effectiveRerunForId);
      if (parentUpdErr) throw parentUpdErr;

      await writeAuditLog({
        facilityId: currentRow.facility_id,
        userId: ctx.user?.id ?? null,
        action: "qc.qual_entry.followup_updated",
        entityType: "qualitative_qc_entry",
        entityId: effectiveRerunForId,
        oldValue: {
          followup_status: parentBefore?.followup_status,
          rerun_entry_id: parentBefore?.rerun_entry_id,
          followup_closed_at: parentBefore?.followup_closed_at,
        },
        newValue: {
          followup_status: parentFollowupStatus,
          rerun_entry_id: id,
          followup_closed_at: parentClosedAt,
          trigger: "linked_rerun_updated",
        },
      });
    }

    const nextFollowupStatus = updates.followup_status as string;
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
        followup_closed_at: currentRow.followup_closed_at,
        followup_override_reason: currentRow.followup_override_reason,
      },
      newValue: {
        submitted: nextSubmitted,
        overall_pass: nextOverallPass,
        corrective_action: nextCorrectiveAction,
        rerun_for_entry_id: effectiveRerunForId,
        followup_status: nextFollowupStatus,
        followup_closed_at: updates.followup_closed_at ?? null,
        followup_override_reason: updates.followup_override_reason ?? currentRow.followup_override_reason,
      },
    });

    if (isOverride) {
      await writeAuditLog({
        facilityId: currentRow.facility_id,
        userId: ctx.user?.id ?? null,
        action: "qc.qual_entry.followup_override",
        entityType: "qualitative_qc_entry",
        entityId: id,
        newValue: {
          followup_status: "override",
          followup_override_reason: updates.followup_override_reason,
          followup_closed_at: updates.followup_closed_at,
        },
      });
    }

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
