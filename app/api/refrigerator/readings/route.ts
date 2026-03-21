/**
 * GET /api/refrigerator/readings — temp readings for a unit (chart data)
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const unitId = searchParams.get("unit_id");
  const range = searchParams.get("range") ?? "24h";

  if (!unitId) {
    return NextResponse.json(
      { data: null, error: "unit_id is required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ data: [], error: null });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const since = new Date();
    if (range === "24h") since.setHours(since.getHours() - 24);
    else if (range === "7d") since.setDate(since.getDate() - 7);
    else since.setDate(since.getDate() - 30);

    const { data, error } = await db
      .from("temp_readings")
      .select("temp_celsius, recorded_at")
      .eq("unit_id", unitId)
      .gte("recorded_at", since.toISOString())
      .order("recorded_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      data: (data ?? []).map((r) => ({
        temp: Number(r.temp_celsius),
        at: r.recorded_at,
      })),
      error: null,
    });
  } catch (err) {
    console.error("[GET /api/refrigerator/readings]", err);
    return NextResponse.json(
      { data: null, error: "Failed to fetch readings" },
      { status: 500 }
    );
  }
}
