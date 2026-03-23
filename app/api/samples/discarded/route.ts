import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";

/** GET /api/samples/discarded
 *  Returns all lab_samples with a discarded_at timestamp, newest first.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facility_id = searchParams.get("facility_id") || DEFAULT_FACILITY_ID;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("lab_samples")
      .select(
        "id, barcode, patient_id, sample_type, position, collection_date, notes, discarded_at, created_at, rack_id, lab_racks(rack_name, rack_date)"
      )
      .eq("facility_id", facility_id)
      .not("discarded_at", "is", null)
      .order("discarded_at", { ascending: false })
      .limit(500);

    if (error) throw error;
    return NextResponse.json({ samples: data ?? [] });
  } catch (err) {
    console.error("[samples/discarded/GET]", err);
    return NextResponse.json({ error: "Failed to fetch discarded samples" }, { status: 500 });
  }
}
