/**
 * ENG-66: Nightly sensitive-field purge — Supabase Edge Function.
 *
 * Scheduled via Supabase Dashboard → Edge Functions → Schedule: "0 2 * * *" (2 AM UTC).
 *
 * Purgeable fields (nullified, rows NOT deleted):
 *   test_requests: lab_number, external_ref, patient_id, external_patient_ref, qr_code_raw
 *   test_results:  free_text_notes
 *
 * Retention is per-facility (facility_capability_profile.lab_number_retention_days, default 90).
 * purge_after is set at record creation: created_at + retention_days.
 *
 * Aggregate metrics (counts, TAT durations, revenue) are pre-aggregated to daily_metrics
 * before nullification so Numbers / TAT charts continue to function over purged date ranges.
 *
 * Purge events are written to audit_log.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BATCH = 2000;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

Deno.serve(async (req: Request) => {
  // Optionally verify a shared secret header (set in Supabase dashboard env)
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const today = todayUtc();
  let testRequestsNullified = 0;
  let testResultsNullified = 0;

  try {
    // ─── Phase 1: Aggregate daily_metrics, then nullify test_requests ────────
    type AggKey = string;
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

    for (;;) {
      const { data: rows, error: selErr } = await db
        .from("test_requests")
        .select(
          "id, facility_id, created_at, test_name, section, received_at, resulted_at, price_ugx, lab_number"
        )
        .lte("purge_after", today)
        .not("lab_number", "is", null)
        .limit(BATCH);

      if (selErr) throw selErr;
      const batch = rows ?? [];
      if (batch.length === 0) break;

      for (const r of batch) {
        const fid = String(r.facility_id ?? "");
        const testDate = String(r.created_at ?? "").slice(0, 10);
        const testName = String(r.test_name ?? "");
        const section = String(r.section ?? "");
        const k = `${fid}|${testDate}|${testName}|${section}`;
        let g = aggregates.get(k);
        if (!g) {
          g = { facility_id: fid, test_date: testDate, test_name: testName, section, count: 0, tatSum: 0, tatN: 0, revenue: 0 };
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

      // Upsert aggregates
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
        if (g.tatN > 0 && prevAvg != null && prevN > 0) mergedAvg = (prevAvg * prevN + g.tatSum) / (prevN + g.tatN);
        else if (g.tatN > 0) mergedAvg = g.tatSum / g.tatN;
        else if (prevAvg != null) mergedAvg = prevAvg;

        await db.from("daily_metrics").upsert(
          { facility_id: g.facility_id, test_date: g.test_date, test_name: g.test_name, section: g.section, request_count: newN, avg_tat_minutes: mergedAvg, revenue_ugx: prevRev + g.revenue, updated_at: new Date().toISOString() },
          { onConflict: "facility_id,test_date,test_name,section" }
        );
      }
      aggregates.clear();

      // Nullify all sensitive fields on test_requests
      const { error: nullErr } = await db
        .from("test_requests")
        .update({ lab_number: null, external_ref: null, patient_id: null, external_patient_ref: null, qr_code_raw: null, updated_at: new Date().toISOString() })
        .in("id", ids);
      if (nullErr) throw nullErr;

      testRequestsNullified += ids.length;
    }

    // ─── Phase 2: Nullify test_results.free_text_notes ───────────────────────
    for (;;) {
      const { data: resRows, error: resErr } = await db
        .from("test_results")
        .select("id")
        .lte("purge_after", today)
        .not("free_text_notes", "is", null)
        .limit(BATCH);

      // If table doesn't exist, skip
      if (resErr) {
        if (String((resErr as { message?: string }).message ?? "").includes("does not exist")) break;
        throw resErr;
      }
      const batch = resRows ?? [];
      if (batch.length === 0) break;

      const ids = batch.map((r) => r.id as string);
      const { error: resNullErr } = await db
        .from("test_results")
        .update({ free_text_notes: null, updated_at: new Date().toISOString() })
        .in("id", ids);
      if (resNullErr) throw resNullErr;

      testResultsNullified += ids.length;
    }

    // ─── Phase 3: Audit log ──────────────────────────────────────────────────
    if (testRequestsNullified > 0 || testResultsNullified > 0) {
      await db.from("audit_log").insert({
        entity_type: "purge_job",
        entity_id: "nightly",
        action: "purge.sensitive_fields",
        user_id: null,
        facility_id: null,
        old_value: null,
        new_value: JSON.stringify({
          date: today,
          test_requests_nullified: testRequestsNullified,
          test_results_nullified: testResultsNullified,
          fields_purged_requests: ["lab_number", "external_ref", "patient_id", "external_patient_ref", "qr_code_raw"],
          fields_purged_results: ["free_text_notes"],
        }),
        created_at: new Date().toISOString(),
      }).then(() => {}).catch(() => {}); // best-effort
    }

    return new Response(
      JSON.stringify({ ok: true, date: today, test_requests_nullified: testRequestsNullified, test_results_nullified: testResultsNullified }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[purge-sensitive-fields]", err);
    return new Response(
      JSON.stringify({ error: "purge_aborted", detail: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
