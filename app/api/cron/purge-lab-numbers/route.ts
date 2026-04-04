/**
 * ENG-99 / ENG-66: Nightly data purge.
 *
 * 1. Pre-aggregate to daily_metrics (counts, avg TAT, revenue) for rows about to be purged.
 * 2. Nullify identifying / sensitive fields on eligible test_requests rows.
 * 3. Nullify free_text_notes on eligible test_results rows.
 * 4. Write purge events to audit_log.
 *
 * Scheduled daily at 02:05 UTC via vercel.json cron.
 * Also callable from the Supabase Edge Function `purge-sensitive-fields`.
 *
 * Fields nullified on test_requests (purge_after < today AND field IS NOT NULL):
 *   lab_number, external_ref, patient_id, external_patient_ref, qr_code_raw
 *
 * Fields nullified on test_results (purge_after < today AND field IS NOT NULL):
 *   free_text_notes
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 300;

const BATCH = 2500;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

type AggKey = string;

function key(
  facilityId: string,
  testDate: string,
  testName: string,
  section: string
): AggKey {
  return `${facilityId}|${testDate}|${testName}|${section}`;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");
  if (!supabaseConfigured) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let Sentry: typeof import("@sentry/nextjs") | null = null;
  try {
    Sentry = await import("@sentry/nextjs");
  } catch {
    /* optional */
  }

  const db = createAdminClient();
  const today = todayUtc();

  try {
    // ─── Phase 1: Aggregate to daily_metrics then nullify test_requests ───────
    const aggregates = new Map<
      AggKey,
      {
        facility_id: string;
        test_date: string;
        test_name: string;
        section: string;
        count: number;
        tatSum: number;
        tatN: number;
        revenue: number;
      }
    >();

    let totalTestRequestsNullified = 0;

    for (;;) {
      const { data: rows, error: selErr } = await db
        .from("test_requests")
        .select(
          "id, facility_id, created_at, test_name, section, received_at, resulted_at, price_ugx, lab_number, external_ref, patient_id, external_patient_ref, qr_code_raw"
        )
        .lte("purge_after", today)
        .not("lab_number", "is", null)
        .limit(BATCH);

      if (selErr) throw selErr;
      const batch = rows ?? [];
      if (batch.length === 0) break;

      for (const r of batch) {
        const fid = r.facility_id as string;
        const testDate = String(r.created_at ?? "").slice(0, 10);
        const testName = String(r.test_name ?? "");
        const section = String(r.section ?? "");
        const k = key(fid, testDate, testName, section);
        let g = aggregates.get(k);
        if (!g) {
          g = {
            facility_id: fid,
            test_date: testDate,
            test_name: testName,
            section,
            count: 0,
            tatSum: 0,
            tatN: 0,
            revenue: 0,
          };
          aggregates.set(k, g);
        }
        g.count += 1;
        const rec = r.received_at ? new Date(r.received_at as string).getTime() : NaN;
        const res = r.resulted_at ? new Date(r.resulted_at as string).getTime() : NaN;
        if (!Number.isNaN(rec) && !Number.isNaN(res) && res >= rec) {
          g.tatSum += Math.floor((res - rec) / 60000);
          g.tatN += 1;
        }
        const px = r.price_ugx != null ? Number(r.price_ugx) : 0;
        if (!Number.isNaN(px)) g.revenue += px;
      }

      const ids = batch.map((r) => r.id as string);

      // Upsert aggregated daily_metrics
      for (const g of aggregates.values()) {
        const { data: ex } = await db
          .from("daily_metrics")
          .select("request_count, avg_tat_minutes, revenue_ugx")
          .eq("facility_id", g.facility_id)
          .eq("test_date", g.test_date)
          .eq("test_name", g.test_name)
          .eq("section", g.section)
          .maybeSingle();

        const prevN = Number(ex?.request_count ?? 0);
        const prevAvg = ex?.avg_tat_minutes != null ? Number(ex.avg_tat_minutes) : null;
        const prevRev = ex?.revenue_ugx != null ? Number(ex.revenue_ugx) : 0;

        const newN = prevN + g.count;
        let mergedAvg: number | null = null;
        if (g.tatN > 0 && prevAvg != null && prevN > 0) {
          mergedAvg = (prevAvg * prevN + g.tatSum) / (prevN + g.tatN);
        } else if (g.tatN > 0) {
          mergedAvg = g.tatSum / g.tatN;
        } else if (prevAvg != null) {
          mergedAvg = prevAvg;
        }

        const { error: upErr } = await db.from("daily_metrics").upsert(
          {
            facility_id: g.facility_id,
            test_date: g.test_date,
            test_name: g.test_name,
            section: g.section,
            request_count: newN,
            avg_tat_minutes: mergedAvg,
            revenue_ugx: prevRev + g.revenue,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "facility_id,test_date,test_name,section" }
        );
        if (upErr) throw upErr;
      }
      aggregates.clear();

      // Nullify all identifying/sensitive fields on test_requests
      const { error: nullErr } = await db
        .from("test_requests")
        .update({
          lab_number: null,
          external_ref: null,
          patient_id: null,
          external_patient_ref: null,
          qr_code_raw: null,
          updated_at: new Date().toISOString(),
        })
        .in("id", ids);
      if (nullErr) throw nullErr;

      totalTestRequestsNullified += ids.length;
    }

    // ─── Phase 2: Nullify test_results.free_text_notes ─────────────────────
    let totalTestResultsNullified = 0;

    for (;;) {
      const { data: resultRows, error: resSelErr } = await db
        .from("test_results")
        .select("id, facility_id")
        .lte("purge_after", today)
        .not("free_text_notes", "is", null)
        .limit(BATCH);

      if (resSelErr) {
        // Table may not exist yet — skip gracefully
        if (
          typeof (resSelErr as { message?: string }).message === "string" &&
          (resSelErr as { message: string }).message.includes("does not exist")
        ) {
          break;
        }
        throw resSelErr;
      }

      const batch = resultRows ?? [];
      if (batch.length === 0) break;

      const ids = batch.map((r) => r.id as string);

      const { error: resNullErr } = await db
        .from("test_results")
        .update({
          free_text_notes: null,
          updated_at: new Date().toISOString(),
        })
        .in("id", ids);
      if (resNullErr) throw resNullErr;

      totalTestResultsNullified += ids.length;
    }

    // ─── Phase 3: Audit log purge event ─────────────────────────────────────
    if (totalTestRequestsNullified > 0 || totalTestResultsNullified > 0) {
      await writeAuditLog({
        facilityId: null,
        userId: null,
        action: "purge.sensitive_fields",
        entityType: "purge_job",
        entityId: null,
        oldValue: null,
        newValue: {
          date: today,
          test_requests_nullified: totalTestRequestsNullified,
          test_results_nullified: totalTestResultsNullified,
          fields_purged_requests: [
            "lab_number",
            "external_ref",
            "patient_id",
            "external_patient_ref",
            "qr_code_raw",
          ],
          fields_purged_results: ["free_text_notes"],
        },
      });
    }

    console.log(
      `[purge] done: ${totalTestRequestsNullified} test_requests nullified, ${totalTestResultsNullified} test_results nullified`
    );

    return NextResponse.json({
      ok: true,
      date: today,
      test_requests_nullified: totalTestRequestsNullified,
      test_results_nullified: totalTestResultsNullified,
    });
  } catch (e) {
    Sentry?.captureException(e);
    console.error("[purge-lab-numbers]", e);
    return NextResponse.json({ error: "purge_aborted" }, { status: 500 });
  }
}
