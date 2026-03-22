/**
 * Weekly Operational Summary Generator
 *
 * Called by a cron job every Monday (or manually via POST).
 * Generates a Markdown summary, stores in weekly_summaries,
 * and optionally sends via Resend email.
 *
 * Data policy: operational metrics only, no patient data.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const MODEL = "claude-3-haiku-20240307";

const WEEKLY_SYSTEM = `You are Kanta Intelligence generating a weekly operational summary for a hospital laboratory manager.

Rules:
1. Summarise only operational data: TAT performance, anomaly patterns, equipment signals, test volumes.
2. NEVER reference individual patients, patient IDs, or clinical result values.
3. Structure: (a) Overall performance vs prior week, (b) Top anomalies, (c) Equipment signals, (d) Items requiring attention.
4. Use plain English. Be direct. Include specific numbers.
5. Tone: professional, concise — like a CFO memo, not a chatbot.
6. Output valid Markdown. Max 400 words.`;

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY required" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const facility_id = body.facility_id || DEFAULT_FACILITY_ID;
  const email_recipients: string[] = body.email_recipients ?? [];

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // last Sunday
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const supabase = createClient();
  const t0 = Date.now();

  /* ── Gather this-week data ── */
  const [anomaliesRes, baselines7dRes, priorWeekRes] = await Promise.all([
    supabase
      .from("tat_anomaly_flags")
      .select("section, test_name, z_score, deviation_pct, is_cluster, cluster_size, reason_text, flagged_at")
      .eq("facility_id", facility_id)
      .gte("flagged_at", weekStart.toISOString())
      .order("z_score", { ascending: false })
      .limit(15),
    supabase
      .from("test_requests")
      .select("section, tat_minutes, received_at")
      .eq("facility_id", facility_id)
      .gte("received_at", weekStart.toISOString())
      .limit(1000),
    supabase
      .from("test_requests")
      .select("section, tat_minutes")
      .eq("facility_id", facility_id)
      .gte("received_at", new Date(weekStart.getTime() - 7 * 86400000).toISOString())
      .lt("received_at", weekStart.toISOString())
      .limit(1000),
  ]);

  /* Volume + avg TAT by section this week */
  const thisWeek: Record<string, { count: number; totalTat: number }> = {};
  for (const r of (baselines7dRes.data ?? [])) {
    const s = r.section ?? "Unknown";
    if (!thisWeek[s]) thisWeek[s] = { count: 0, totalTat: 0 };
    thisWeek[s].count++;
    thisWeek[s].totalTat += r.tat_minutes ? parseFloat(r.tat_minutes) : 0;
  }

  const priorWeek: Record<string, { count: number; totalTat: number }> = {};
  for (const r of (priorWeekRes.data ?? [])) {
    const s = r.section ?? "Unknown";
    if (!priorWeek[s]) priorWeek[s] = { count: 0, totalTat: 0 };
    priorWeek[s].count++;
    priorWeek[s].totalTat += r.tat_minutes ? parseFloat(r.tat_minutes) : 0;
  }

  const thisWeekSummary = Object.entries(thisWeek).map(([section, { count, totalTat }]) => ({
    section,
    count,
    avg_tat: count > 0 ? Math.round(totalTat / count) : null,
  }));

  const priorWeekSummary = Object.entries(priorWeek).map(([section, { count, totalTat }]) => ({
    section,
    count,
    avg_tat: count > 0 ? Math.round(totalTat / count) : null,
  }));

  const context = {
    week: `${weekStart.toDateString()} – ${weekEnd.toDateString()}`,
    this_week: { volume_by_section: thisWeekSummary, anomaly_count: anomaliesRes.data?.length ?? 0 },
    prior_week: { volume_by_section: priorWeekSummary },
    top_anomalies: (anomaliesRes.data ?? []).slice(0, 5),
    clusters: (anomaliesRes.data ?? []).filter((a) => a.is_cluster),
  };

  const userMessage = `Operational data for this week:\n${JSON.stringify(context, null, 2)}\n\nGenerate the weekly summary.`;

  try {
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        system: WEEKLY_SYSTEM,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    const aiData = await aiRes.json();
    if (!aiRes.ok) throw new Error(aiData?.error?.message ?? "AI error");

    const summaryMd: string = aiData.content?.[0]?.text ?? "Summary unavailable.";
    const outputHash = await sha256(summaryMd);
    const latencyMs = Date.now() - t0;

    /* ── Store summary ── */
    const { data: stored, error: storeErr } = await supabase
      .from("weekly_summaries")
      .upsert(
        {
          facility_id,
          week_start: weekStart.toISOString().slice(0, 10),
          week_end: weekEnd.toISOString().slice(0, 10),
          summary_md: summaryMd,
          top_anomalies: (anomaliesRes.data ?? []).slice(0, 5),
          kpi_snapshot: context.this_week,
          prior_period_delta: context.prior_week,
          model_version: MODEL,
          generated_at: new Date().toISOString(),
          email_recipients,
        },
        { onConflict: "facility_id,week_start" }
      )
      .select("id")
      .single();

    if (storeErr) throw storeErr;

    /* ── Log inference ── */
    await supabase.from("ai_inference_log").insert({
      facility_id,
      feature: "weekly_summary",
      model: MODEL,
      prompt_tokens: aiData.usage?.input_tokens ?? 0,
      completion_tokens: aiData.usage?.output_tokens ?? 0,
      data_sources: ["tat_anomaly_flags", "test_requests"],
      data_row_count:
        (baselines7dRes.data?.length ?? 0) + (priorWeekRes.data?.length ?? 0),
      output_hash: outputHash,
      latency_ms: latencyMs,
    });

    /* ── Optionally email via Resend ── */
    let emailed = false;
    if (RESEND_KEY && email_recipients.length > 0) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Kanta Intelligence <noreply@kanta.app>",
            to: email_recipients,
            subject: `Weekly Lab Summary — ${weekStart.toDateString()}`,
            text: summaryMd,
          }),
        });
        emailed = emailRes.ok;
        if (emailed && stored?.id) {
          await supabase
            .from("weekly_summaries")
            .update({ emailed_at: new Date().toISOString() })
            .eq("id", stored.id);
        }
      } catch {}
    }

    return NextResponse.json({
      summary_id: stored?.id,
      week_start: weekStart.toISOString().slice(0, 10),
      summary_md: summaryMd,
      emailed,
      latency_ms: latencyMs,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* GET: fetch stored summaries for in-app display */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facility_id = searchParams.get("facility_id") || DEFAULT_FACILITY_ID;
  const limit = parseInt(searchParams.get("limit") || "8", 10);

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("weekly_summaries")
      .select("id, week_start, week_end, summary_md, top_anomalies, kpi_snapshot, generated_at, emailed_at")
      .eq("facility_id", facility_id)
      .order("week_start", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return NextResponse.json({ summaries: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch summaries" }, { status: 500 });
  }
}
