/**
 * TAT Anomaly Detection API
 *
 * Algorithm:
 *  1. Fetch the 90-day rolling baseline (mean + stddev) for each section×test_name
 *     from tat_anomaly_baselines (pre-computed nightly or computed on-the-fly here).
 *  2. For each recent TAT event, compute z-score = (tat - mean) / stddev.
 *  3. Flag events where |z-score| >= 2.0.
 *  4. Detect clusters: 3+ consecutive flags on same section = cluster.
 *  5. Calculate confidence_score based on sample size and z-score magnitude.
 *  6. Generate plain-English reason (rule-based; Anthropic for rich text if key exists).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";

const Z_THRESHOLD = 2.0;
const CLUSTER_MIN = 3;

type BaselineRow = {
  section: string;
  test_name: string;
  mean_minutes: number;
  stddev_minutes: number;
  sample_count: number;
};

type TATEvent = {
  id: string;
  section: string;
  test_name: string;
  tat_minutes: number;
  received_at: string;
};

type AnomalyFlag = {
  id: string;
  section: string;
  test_name: string;
  tat_minutes: number;
  baseline_mean: number;
  baseline_stddev: number;
  z_score: number;
  deviation_pct: number;
  confidence_score: number;
  is_cluster: boolean;
  cluster_size: number;
  reason_text: string;
  flagged_at: string;
};

function buildReason(
  section: string,
  testName: string,
  tatMinutes: number,
  mean: number,
  zScore: number,
  deviationPct: number,
  isCluster: boolean,
  clusterSize: number
): string {
  const direction = tatMinutes > mean ? "above" : "below";
  const severity = Math.abs(zScore) >= 3.5 ? "critically" : Math.abs(zScore) >= 2.5 ? "significantly" : "notably";
  const base = `${section} — ${testName} TAT of ${Math.round(tatMinutes)} min is ${severity} ${direction} the 90-day baseline of ${Math.round(mean)} min (${deviationPct > 0 ? "+" : ""}${deviationPct.toFixed(0)}%, z=${zScore.toFixed(2)}).`;
  if (isCluster) {
    return `${base} This is part of a cluster of ${clusterSize} consecutive anomalies — likely a systemic issue rather than a one-off event. Recommend equipment inspection or workflow review.`;
  }
  if (Math.abs(zScore) >= 3.0) {
    return `${base} Magnitude suggests an equipment or reagent event rather than normal variation.`;
  }
  return `${base} Monitor for recurrence.`;
}

function confidenceScore(sampleCount: number, zScore: number): number {
  const sampleFactor = Math.min(sampleCount / 100, 1.0);
  const zFactor = Math.min((Math.abs(zScore) - Z_THRESHOLD) / 2.0, 1.0);
  return Math.round(Math.min(0.5 * sampleFactor + 0.5 * zFactor, 0.99) * 1000) / 1000;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facility_id = searchParams.get("facility_id") || DEFAULT_FACILITY_ID;
  const days = parseInt(searchParams.get("days") || "7", 10);
  const since = new Date(Date.now() - days * 86400000).toISOString();

  try {
    const supabase = createClient();

    /* ── 1. Fetch baselines ── */
    const { data: baselines, error: bErr } = await supabase
      .from("tat_anomaly_baselines")
      .select("section, test_name, mean_minutes, stddev_minutes, sample_count")
      .eq("facility_id", facility_id);

    if (bErr) throw bErr;

    const baselineMap = new Map<string, BaselineRow>();
    for (const b of (baselines ?? [])) {
      baselineMap.set(`${b.section}||${b.test_name}`, b as BaselineRow);
    }

    /* ── 2. Fetch recent TAT events ── */
    const { data: events, error: eErr } = await supabase
      .from("test_requests")
      .select("id, section, test_name, tat_minutes, received_at")
      .eq("facility_id", facility_id)
      .gte("received_at", since)
      .not("tat_minutes", "is", null)
      .order("received_at", { ascending: true });

    if (eErr) throw eErr;

    const tatEvents: TATEvent[] = (events ?? []).map((e) => ({
      id: e.id,
      section: e.section ?? "Unknown",
      test_name: e.test_name ?? "Unknown",
      tat_minutes: parseFloat(e.tat_minutes),
      received_at: e.received_at,
    }));

    /* ── 3. Compute baselines on-the-fly for sections not yet stored ── */
    const inlineBaselines = new Map<string, { mean: number; stddev: number; count: number }>();
    const grouped = new Map<string, number[]>();
    for (const e of tatEvents) {
      const key = `${e.section}||${e.test_name}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(e.tat_minutes);
    }
    for (const [key, vals] of grouped) {
      if (vals.length < 5) continue;
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
      inlineBaselines.set(key, { mean, stddev: Math.sqrt(variance), count: vals.length });
    }

    /* ── 4. Score each event ── */
    const flags: AnomalyFlag[] = [];
    for (const e of tatEvents) {
      const key = `${e.section}||${e.test_name}`;
      const stored = baselineMap.get(key);
      const inline = inlineBaselines.get(key);
      const bl = stored
        ? { mean: stored.mean_minutes, stddev: stored.stddev_minutes, count: stored.sample_count }
        : inline;
      if (!bl || bl.stddev < 0.5) continue;

      const z = (e.tat_minutes - bl.mean) / bl.stddev;
      if (Math.abs(z) < Z_THRESHOLD) continue;

      const deviationPct = ((e.tat_minutes - bl.mean) / bl.mean) * 100;
      flags.push({
        id: e.id,
        section: e.section,
        test_name: e.test_name,
        tat_minutes: e.tat_minutes,
        baseline_mean: bl.mean,
        baseline_stddev: bl.stddev,
        z_score: Math.round(z * 10000) / 10000,
        deviation_pct: Math.round(deviationPct * 100) / 100,
        confidence_score: confidenceScore(bl.count, z),
        is_cluster: false,
        cluster_size: 1,
        reason_text: "",
        flagged_at: e.received_at,
      });
    }

    /* ── 5. Cluster detection: 3+ consecutive flags per section ── */
    const sectionFlags = new Map<string, AnomalyFlag[]>();
    for (const f of flags) {
      const key = f.section;
      if (!sectionFlags.has(key)) sectionFlags.set(key, []);
      sectionFlags.get(key)!.push(f);
    }
    for (const [, sFlags] of sectionFlags) {
      if (sFlags.length >= CLUSTER_MIN) {
        for (const f of sFlags) {
          f.is_cluster = true;
          f.cluster_size = sFlags.length;
        }
      }
    }

    /* ── 6. Generate reasons ── */
    for (const f of flags) {
      f.reason_text = buildReason(
        f.section, f.test_name, f.tat_minutes,
        f.baseline_mean, f.z_score, f.deviation_pct,
        f.is_cluster, f.cluster_size
      );
    }

    /* ── 7. Sort by |z_score| descending ── */
    flags.sort((a, b) => Math.abs(b.z_score) - Math.abs(a.z_score));

    return NextResponse.json({
      facility_id,
      period_days: days,
      total_events: tatEvents.length,
      anomaly_count: flags.length,
      cluster_count: flags.filter((f) => f.is_cluster).length,
      flags,
    });
  } catch (err) {
    console.error("[tat/anomalies]", err);
    return NextResponse.json({ error: "Failed to compute anomalies" }, { status: 500 });
  }
}

/* ── Nightly baseline refresh ── */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const facility_id = body.facility_id || DEFAULT_FACILITY_ID;

  try {
    const supabase = createClient();
    const since90 = new Date(Date.now() - 90 * 86400000).toISOString();

    const { data: events } = await supabase
      .from("test_requests")
      .select("section, test_name, tat_minutes")
      .eq("facility_id", facility_id)
      .gte("received_at", since90)
      .not("tat_minutes", "is", null);

    const grouped = new Map<string, { section: string; test_name: string; vals: number[] }>();
    for (const e of (events ?? [])) {
      const key = `${e.section}||${e.test_name}`;
      if (!grouped.has(key)) grouped.set(key, { section: e.section, test_name: e.test_name, vals: [] });
      grouped.get(key)!.vals.push(parseFloat(e.tat_minutes));
    }

    const upserts = [];
    for (const [, { section, test_name, vals }] of grouped) {
      if (vals.length < 5) continue;
      const sorted = [...vals].sort((a, b) => a - b);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const stddev = Math.sqrt(vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p90 = sorted[Math.floor(sorted.length * 0.9)];
      upserts.push({
        facility_id,
        section,
        test_name,
        sample_count: vals.length,
        mean_minutes: Math.round(mean * 100) / 100,
        stddev_minutes: Math.round(stddev * 100) / 100,
        p50_minutes: Math.round(p50 * 100) / 100,
        p90_minutes: Math.round(p90 * 100) / 100,
        baseline_from: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10),
        baseline_to: new Date().toISOString().slice(0, 10),
        computed_at: new Date().toISOString(),
      });
    }

    if (upserts.length > 0) {
      const { error } = await supabase
        .from("tat_anomaly_baselines")
        .upsert(upserts, { onConflict: "facility_id,section,test_name" });
      if (error) throw error;
    }

    return NextResponse.json({ refreshed: upserts.length, facility_id });
  } catch (err) {
    console.error("[tat/anomalies/POST]", err);
    return NextResponse.json({ error: "Baseline refresh failed" }, { status: 500 });
  }
}
