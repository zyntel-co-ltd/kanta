/**
 * ENG-100: Historical test_requests import (CSV/JSON), deduped via unique index.
 */

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAdminPanel } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase";
import {
  normalizeImportRow,
  parseTestRequestImportFile,
} from "@/lib/data-import/parseTestRequestFile";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 10 * 1024 * 1024;
const CHUNK = 500;

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function POST(req: NextRequest) {
  if (!supabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const form = await req.formData();
  const facilityId = String(form.get("facility_id") ?? "").trim();
  const file = form.get("file");
  if (!facilityId || !(file instanceof File)) {
    return NextResponse.json({ error: "facility_id and file required" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  const ext = name.endsWith(".json") ? ".json" : ".csv";

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const denied = requireAdminPanel(ctx, facilityId);
  if (denied) return denied;

  const db = createAdminClient();
  const { data: cap } = await db
    .from("facility_capability_profile")
    .select("test_name_mappings, lab_number_retention_days")
    .eq("facility_id", facilityId)
    .maybeSingle();
  const mappings = cap?.test_name_mappings;
  const retentionDays =
    typeof cap?.lab_number_retention_days === "number" && cap.lab_number_retention_days > 0
      ? cap.lab_number_retention_days
      : 90;

  let parsed: ReturnType<typeof parseTestRequestImportFile>;
  try {
    parsed = parseTestRequestImportFile(buf, ext);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid file" },
      { status: 400 }
    );
  }

  const jobId = randomUUID();
  const errors: { row: number; message: string }[] = [];
  const toInsert: Record<string, unknown>[] = [];
  let skippedParse = 0;

  parsed.forEach((raw, idx) => {
    const n = normalizeImportRow(raw, facilityId, mappings, retentionDays);
    if (!n.row) {
      skippedParse += 1;
      if (n.error) errors.push({ row: idx + 2, message: n.error });
      return;
    }
    toInsert.push({
      facility_id: n.row.facility_id,
      lab_number: n.row.lab_number,
      test_name: n.row.test_name,
      section: n.row.section,
      priority: n.row.priority,
      requested_at: n.row.requested_at,
      received_at: n.row.received_at,
      resulted_at: n.row.resulted_at,
      status: n.row.status,
      patient_id: n.row.patient_id,
      price_ugx: n.row.price_ugx,
      external_ref: n.row.external_ref,
      purge_after: n.row.purge_after,
      lims_connection_id: null,
      lims_external_id: null,
    });
  });

  let inserted = 0;
  let skippedDup = 0;
  let failed = 0;

  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK);
    const { data: upserted, error } = await db
      .from("test_requests")
      .upsert(chunk, {
        onConflict: "facility_id,dedupe_lab,test_name,section,dedupe_day",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error) {
      failed += chunk.length;
      errors.push({ row: i, message: error.message });
      continue;
    }
    const n = upserted?.length ?? 0;
    inserted += n;
    skippedDup += chunk.length - n;
  }

  await db.from("data_import_jobs").insert({
    id: jobId,
    facility_id: facilityId,
    created_by: ctx.user?.id ?? null,
    status: failed && !inserted ? "failed" : "completed",
    total_rows: parsed.length,
    inserted,
    skipped: skippedDup + skippedParse,
    failed,
    error_report: errors.length ? errors : null,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({
    job_id: jobId,
    total_rows: parsed.length,
    inserted,
    skipped: skippedDup + skippedParse,
    failed,
    errors: errors.slice(0, 100),
  });
}
