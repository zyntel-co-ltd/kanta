import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";

/** GET /api/samples/pending
 *  Returns racks whose rack_date is older than 14 days
 *  AND that still have at least one non-discarded sample.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facility_id = searchParams.get("facility_id") || DEFAULT_FACILITY_ID;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  try {
    const supabase = createClient();

    /* Step 1: racks older than 14 days */
    const { data: oldRacks, error: racksErr } = await supabase
      .from("lab_racks")
      .select("id, rack_name, rack_date, rack_type, description, status")
      .eq("facility_id", facility_id)
      .lt("rack_date", cutoffDate)
      .order("rack_date", { ascending: true });

    if (racksErr) throw racksErr;
    if (!oldRacks || oldRacks.length === 0) return NextResponse.json({ racks: [] });

    const oldRackIds = oldRacks.map((r) => r.id);

    /* Step 2: which of those racks still have non-discarded samples? */
    const { data: pendingSamples } = await supabase
      .from("lab_samples")
      .select("rack_id")
      .in("rack_id", oldRackIds)
      .is("discarded_at", null);

    const rackIdsWithSamples = new Set((pendingSamples ?? []).map((s) => s.rack_id));

    /* Step 3: count samples per rack */
    const pending = await Promise.all(
      oldRacks
        .filter((r) => rackIdsWithSamples.has(r.id))
        .map(async (r) => {
          const { data: samps } = await supabase
            .from("lab_samples")
            .select("id")
            .eq("rack_id", r.id)
            .is("discarded_at", null);
          return { ...r, total_samples: samps?.length ?? 0 };
        })
    );

    return NextResponse.json({ racks: pending });
  } catch (err) {
    console.error("[samples/pending/GET]", err);
    return NextResponse.json({ error: "Failed to fetch pending racks" }, { status: 500 });
  }
}
