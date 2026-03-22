import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facility_id = searchParams.get("facility_id") || DEFAULT_FACILITY_ID;

  try {
    const supabase = createClient();

    const [racksRes, samplesRes] = await Promise.all([
      supabase
        .from("lab_racks")
        .select("id, status")
        .eq("facility_id", facility_id),
      supabase
        .from("lab_samples")
        .select("id, discarded_at")
        .eq("facility_id", facility_id),
    ]);

    const racks = racksRes.data ?? [];
    const samples = samplesRes.data ?? [];

    const stats = {
      total_racks: racks.length,
      total_samples: samples.length,
      pending_discarding: samples.filter((s) => !s.discarded_at).length,
      rack_status: {
        empty: racks.filter((r) => r.status === "empty").length,
        partial: racks.filter((r) => r.status === "partial").length,
        full: racks.filter((r) => r.status === "full").length,
      },
    };

    return NextResponse.json(stats);
  } catch (err) {
    console.error("[samples/stats]", err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
