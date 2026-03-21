/**
 * GET /api/qc/materials — QC materials with last run
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");

  if (!facilityId) {
    return NextResponse.json(
      { data: null, error: "facility_id is required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ data: [], error: null });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: materials } = await db
      .from("qc_materials")
      .select("*")
      .eq("facility_id", facilityId)
      .eq("is_active", true);

    const withLastRun = await Promise.all(
      (materials ?? []).map(async (m) => {
        const { data: last } = await db
          .from("qc_runs")
          .select("value, run_at, westgard_flags")
          .eq("material_id", m.id)
          .order("run_at", { ascending: false })
          .limit(1)
          .single();

        const flags = (last?.westgard_flags as string[]) ?? [];
        const hasRejection = flags.some((f: string) =>
          ["1-3s", "2-2s", "R-4s", "4-1s", "10x"].includes(f)
        );

        return {
          ...m,
          last_value: last?.value ?? null,
          last_run_at: last?.run_at ?? null,
          pass: last ? !hasRejection : null,
        };
      })
    );

    return NextResponse.json({ data: withLastRun, error: null });
  } catch (err) {
    console.error("[GET /api/qc/materials]", err);
    return NextResponse.json(
      { data: null, error: "Failed to fetch materials" },
      { status: 500 }
    );
  }
}
