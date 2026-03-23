import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facility_id = searchParams.get("facility_id") || DEFAULT_FACILITY_ID;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  try {
    const supabase = createClient();

    const [racksRes, samplesRes, oldRacksRes] = await Promise.all([
      supabase.from("lab_racks").select("id, status").eq("facility_id", facility_id),
      supabase.from("lab_samples").select("id, discarded_at").eq("facility_id", facility_id),
      supabase.from("lab_racks").select("id").eq("facility_id", facility_id).lt("rack_date", cutoffDate),
    ]);

    const racks = racksRes.data ?? [];
    const samples = samplesRes.data ?? [];
    const oldRackIds = (oldRacksRes.data ?? []).map((r) => r.id);

    /* Count racks > 14 days old that still have at least one non-discarded sample */
    let pending_discarding = 0;
    if (oldRackIds.length > 0) {
      const { data: pendingSamples } = await supabase
        .from("lab_samples")
        .select("rack_id")
        .in("rack_id", oldRackIds)
        .is("discarded_at", null);
      pending_discarding = new Set((pendingSamples ?? []).map((s) => s.rack_id)).size;
    }

    return NextResponse.json({
      total_racks: racks.length,
      total_samples: samples.filter((s) => !s.discarded_at).length,
      pending_discarding,
      rack_status: {
        empty:   racks.filter((r) => r.status === "empty").length,
        partial: racks.filter((r) => r.status === "partial").length,
        full:    racks.filter((r) => r.status === "full").length,
      },
    });
  } catch (err) {
    console.error("[samples/stats]", err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
