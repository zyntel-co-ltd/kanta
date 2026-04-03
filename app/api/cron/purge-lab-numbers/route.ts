/**
 * ENG-99: Nightly pre-aggregate to daily_metrics, then nullify lab PII on eligible rows.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

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
    const aggregates = new Map<
      AggKey,
      { facility_id: string; test_date: string; test_name: string; section: string; count: number; tatSum: number; tatN: number; revenue: number }
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

      const { error: nullErr } = await db
        .from("test_requests")
        .update({
          lab_number: null,
          external_ref: null,
          patient_id: null,
          updated_at: new Date().toISOString(),
        })
        .in("id", ids);
      if (nullErr) throw nullErr;
    }

    return NextResponse.json({ ok: true, date: today });
  } catch (e) {
    Sentry?.captureException(e);
    console.error("[purge-lab-numbers]", e);
    return NextResponse.json({ error: "purge_aborted" }, { status: 500 });
  }
}
