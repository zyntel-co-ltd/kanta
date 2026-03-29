/**
 * Natural Language Dashboard Query API
 *
 * Strict data policy:
 *  - Only facility operational data is passed to the model.
 *  - No patient names, no patient IDs, no clinical results.
 *  - System prompt hard-prohibits clinical or patient inference.
 *  - Every call logged to ai_inference_log.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-3-haiku-20240307";

const SYSTEM_PROMPT = `You are Kanta Intelligence, an operational analytics assistant for a hospital laboratory.

STRICT RULES — violating these is not permitted under any circumstances:
1. You ONLY answer questions about operational metrics: TAT, test volumes, equipment status, QC results, revenue, and anomaly patterns.
2. You NEVER make clinical inferences, diagnose, or comment on patient-level data.
3. You NEVER reveal individual patient identifiers, lab numbers, or result values.
4. If a question touches patient-level data, respond: "I can only answer questions about lab operational metrics, not individual patient data."
5. All answers must reference the facility's own data only — no external benchmarks unless explicitly provided.
6. Keep answers concise (≤ 4 sentences or a short list). Prefer numbers over words.
7. If you cannot answer confidently from the data provided, say so clearly.

You are speaking to a lab manager or administrator. Use plain language — no clinical jargon.`;

function logInference(
  supabase: ReturnType<typeof createClient>,
  params: {
    facility_id: string;
    user_id?: string;
    feature: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    dataSources: string[];
    dataRowCount: number;
    outputHash: string;
    latencyMs: number;
    error?: string;
  }
) {
  return supabase.from("ai_inference_log").insert({
    facility_id: params.facility_id,
    user_id: params.user_id,
    feature: params.feature,
    model: params.model,
    prompt_tokens: params.promptTokens,
    completion_tokens: params.completionTokens,
    data_sources: params.dataSources,
    data_row_count: params.dataRowCount,
    output_hash: params.outputHash,
    latency_ms: params.latencyMs,
    error: params.error,
  });
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_KEY) {
    return NextResponse.json({ error: "AI features require ANTHROPIC_API_KEY" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const { question, facility_id = DEFAULT_FACILITY_ID, user_id } = body;

  if (!question?.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  const t0 = Date.now();
  const supabase = createClient();

  /* ── Gather operational context (NO patient data) ── */
  const [tatRes, anomalyRes, volumeRes] = await Promise.all([
    supabase
      .from("tat_anomaly_baselines")
      .select("section, test_name, mean_minutes, p90_minutes, sample_count")
      .eq("facility_id", facility_id)
      .limit(30),
    supabase
      .from("tat_anomaly_flags")
      .select("section, test_name, z_score, deviation_pct, reason_text, flagged_at")
      .eq("facility_id", facility_id)
      .gte("flagged_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .order("flagged_at", { ascending: false })
      .limit(20),
    supabase
      .from("test_requests")
      .select("section, test_name, received_at")
      .eq("facility_id", facility_id)
      .gte("received_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .limit(500),
  ]);

  /* Aggregate volume by section (no individual records sent to AI) */
  const volumeBySection: Record<string, number> = {};
  for (const r of (volumeRes.data ?? [])) {
    const s = r.section ?? "Unknown";
    volumeBySection[s] = (volumeBySection[s] ?? 0) + 1;
  }

  const context = {
    baselines: tatRes.data ?? [],
    recent_anomalies: anomalyRes.data ?? [],
    volume_by_section_7d: volumeBySection,
  };

  const dataSources = ["tat_anomaly_baselines", "tat_anomaly_flags", "test_requests"];
  const dataRowCount =
    (tatRes.data?.length ?? 0) + (anomalyRes.data?.length ?? 0) + Object.keys(volumeBySection).length;

  const userMessage = `Facility operational data (JSON):\n${JSON.stringify(context, null, 2)}\n\nQuestion: ${question}`;

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      return NextResponse.json(
        { error: "AI is temporarily unavailable. Try again in a moment." },
        { status: 502 }
      );
    }

    const answer: string = data.content?.[0]?.text ?? "No answer generated.";
    const latencyMs = Date.now() - t0;
    const outputHash = await sha256(answer);

    await logInference(supabase, {
      facility_id,
      user_id,
      feature: "nl_query",
      model: MODEL,
      promptTokens: data.usage?.input_tokens ?? 0,
      completionTokens: data.usage?.output_tokens ?? 0,
      dataSources,
      dataRowCount,
      outputHash,
      latencyMs,
    });

    return NextResponse.json({ answer, latency_ms: latencyMs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await logInference(supabase, {
      facility_id,
      user_id,
      feature: "nl_query",
      model: MODEL,
      promptTokens: 0,
      completionTokens: 0,
      dataSources,
      dataRowCount,
      outputHash: "",
      latencyMs: Date.now() - t0,
      error: msg,
    });
    const friendly =
      msg.includes("fetch failed") || msg.includes("network") || msg.includes("ECONNREFUSED")
        ? "AI is temporarily unavailable. Check your connection and try again."
        : "Something went wrong processing your question. Please try again.";
    return NextResponse.json({ error: friendly }, { status: 503 });
  }
}
