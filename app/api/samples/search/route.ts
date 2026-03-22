import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facility_id = searchParams.get("facility_id") || DEFAULT_FACILITY_ID;
  const q = searchParams.get("q") || "";
  const field = searchParams.get("field") || "all";

  if (!q.trim()) return NextResponse.json({ results: [] });

  try {
    const supabase = createClient();
    let query = supabase
      .from("lab_samples")
      .select("id, barcode, patient_id, sample_type, position, collection_date, notes, rack_id, discarded_at, lab_racks(rack_name, rack_date)")
      .eq("facility_id", facility_id)
      .limit(50);

    if (field === "barcode") {
      query = query.ilike("barcode", `%${q}%`);
    } else if (field === "patient_id") {
      query = query.ilike("patient_id", `%${q}%`);
    } else {
      query = query.or(`barcode.ilike.%${q}%,patient_id.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ results: data ?? [] });
  } catch (err) {
    console.error("[samples/search]", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
