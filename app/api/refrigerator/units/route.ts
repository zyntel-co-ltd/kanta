/**
 * GET /api/refrigerator/units — refrigerator units with latest reading
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

    const { data: units, error } = await db
      .from("refrigerator_units")
      .select("*")
      .eq("facility_id", facilityId)
      .eq("is_active", true);

    if (error) throw error;

    const withReadings = await Promise.all(
      (units ?? []).map(async (u) => {
        const { data: latest } = await db
          .from("temp_readings")
          .select("temp_celsius, recorded_at")
          .eq("unit_id", u.id)
          .order("recorded_at", { ascending: false })
          .limit(1)
          .single();

        const fifteenMinAgo = new Date();
        fifteenMinAgo.setMinutes(fifteenMinAgo.getMinutes() - 15);
        const offline = !latest || new Date(latest.recorded_at) < fifteenMinAgo;

        const minT = Number(u.min_temp_celsius);
        const maxT = Number(u.max_temp_celsius);
        const temp = latest ? Number(latest.temp_celsius) : null;
        const breach = temp != null && (temp < minT || temp > maxT);

        let status: "ok" | "breach" | "offline" = "ok";
        if (offline) status = "offline";
        else if (breach) status = "breach";

        return {
          ...u,
          latest_temp: temp,
          latest_recorded_at: latest?.recorded_at ?? null,
          status,
        };
      })
    );

    return NextResponse.json({ data: withReadings, error: null });
  } catch (err) {
    console.error("[GET /api/refrigerator/units]", err);
    return NextResponse.json(
      { data: null, error: "Failed to fetch units" },
      { status: 500 }
    );
  }
}
