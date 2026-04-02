/**
 * GET /api/qc/runs — QC runs for a material (L-J chart data)
 * POST /api/qc/runs — manual QC run entry
 */

import { NextRequest, NextResponse } from "next/server";
import { evaluateWestgard, computeZScore, detectDriftAlerts } from "@/lib/westgard";
import { getAuthContext } from "@/lib/auth/server";
import { writeAuditLog } from "@/lib/audit";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const materialId = searchParams.get("material_id");
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  if (!materialId) {
    return NextResponse.json(
      { data: null, error: "material_id is required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ data: [], error: null });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: material } = await db
      .from("qc_materials")
      .select("target_mean, target_sd")
      .eq("id", materialId)
      .single();

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    const mean = Number(material.target_mean);
    const sd = Number(material.target_sd);

    const { data: runs } = await db
      .from("qc_runs")
      .select("id, value, run_at, z_score")
      .eq("material_id", materialId)
      .order("run_at", { ascending: true })
      .limit(limit);

    const runsWithValues = (runs ?? []).map((r) => ({
      id: String(r.id),
      value: Number(r.value),
      run_at: String(r.run_at),
      z_score: r.z_score != null ? Number(r.z_score) : null,
    }));
    const driftMap = detectDriftAlerts(runsWithValues, mean, sd);

    const points = (runs ?? []).map((r, i) => {
      const z = r.z_score != null ? Number(r.z_score) : computeZScore(Number(r.value), mean, sd);
      let status: "ok" | "warning" | "rejection" = "ok";
      if (Math.abs(z) >= 3) status = "rejection";
      else if (Math.abs(z) >= 2) status = "warning";
      const drift = driftMap[String(r.id)] ?? null;

      return {
        id: r.id,
        runNumber: i + 1,
        date: r.run_at,
        value: Number(r.value),
        zScore: z,
        status,
        drift_alert: drift,
      };
    });

    return NextResponse.json({
      data: { points, mean, sd },
      error: null,
    });
  } catch (err) {
    console.error("[GET /api/qc/runs]", err);
    return NextResponse.json(
      { data: null, error: "Failed to fetch runs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!supabaseConfigured) {
    return NextResponse.json({ error: "Not configured" }, { status: 501 });
  }

  try {
    const body = await req.json();
    const { material_id, facility_id, value, instrument_id, operator_id } = body;

    if (!material_id || !facility_id || value == null) {
      return NextResponse.json(
        { error: "material_id, facility_id, value required" },
        { status: 400 }
      );
    }

    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: material } = await db
      .from("qc_materials")
      .select("target_mean, target_sd, analyte, lot_number")
      .eq("id", material_id)
      .single();

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    const mean = Number(material.target_mean);
    const sd = Number(material.target_sd);
    const val = Number(value);
    const zScore = computeZScore(val, mean, sd);

    const { data: recentRuns } = await db
      .from("qc_runs")
      .select("id, value, run_at")
      .eq("material_id", material_id)
      .order("run_at", { ascending: false })
      .limit(20);

    const runsForWestgard = [
      ...(recentRuns ?? []).reverse(),
      { id: "new", value: val, run_at: new Date().toISOString() },
    ];
    const flags = evaluateWestgard(
      runsForWestgard.map((r) => ({ id: r.id, value: r.value, run_at: r.run_at })),
      mean,
      sd
    );

    const { data: run, error } = await db
      .from("qc_runs")
      .insert({
        material_id,
        facility_id,
        value: val,
        z_score: zScore,
        westgard_flags: flags.map((f) => f.rule),
        instrument_id: instrument_id ?? null,
        operator_id: operator_id ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    const ctx = await getAuthContext(req);

    if (flags.some((f) => f.level === "rejection")) {
      await db.from("qc_violations").insert({
        run_id: run.id,
        facility_id,
        rule: flags.find((f) => f.level === "rejection")!.rule,
      });

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count: recentFlaggedCount } = await db
        .from("qc_runs")
        .select("id", { count: "exact", head: true })
        .eq("material_id", material_id)
        .gte("run_at", since)
        .neq("westgard_flags", "[]");

      if ((recentFlaggedCount ?? 0) >= 3) {
        const { data: existingRecommendation } = await db
          .from("qc_lot_recommendations")
          .select("id, status, violation_count")
          .eq("facility_id", facility_id)
          .eq("material_id", material_id)
          .maybeSingle();

        await db.from("qc_lot_recommendations").upsert(
          {
            facility_id,
            material_id,
            analyte: String(material.analyte ?? "Unknown"),
            lot_number: material.lot_number ?? null,
            violation_count: recentFlaggedCount,
            window_days: 30,
            status: "open",
            first_detected_at: existingRecommendation?.id ? undefined : new Date().toISOString(),
            last_detected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            resolved_at: null,
          },
          { onConflict: "facility_id,material_id" }
        );

        await writeAuditLog({
          facilityId: facility_id,
          userId: ctx.user?.id ?? null,
          action: "qc.lot_review_recommended",
          entityType: "qc_lot_recommendation",
          entityId: existingRecommendation?.id ?? null,
          newValue: {
            material_id,
            analyte: material.analyte ?? "Unknown",
            lot_number: material.lot_number ?? null,
            violation_count: recentFlaggedCount,
            window_days: 30,
          },
        });
      }
    }

    await writeAuditLog({
      facilityId: facility_id,
      userId: ctx.user?.id ?? null,
      action: "qc.submitted",
      entityType: "qc_run",
      entityId: run.id,
      newValue: {
        material_id,
        value: val,
        z_score: zScore,
      },
    });

    return NextResponse.json({ data: run, error: null });
  } catch (err) {
    console.error("[POST /api/qc/runs]", err);
    return NextResponse.json(
      { error: "Failed to create run" },
      { status: 500 }
    );
  }
}
