import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

type Params = { params: Promise<{ id: string }> };

/** GET /api/samples/racks/:id  →  rack details + its samples */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const supabase = createClient();
    const [rackRes, samplesRes] = await Promise.all([
      supabase
        .from("lab_racks")
        .select("id, rack_name, rack_date, rack_type, description, status, created_at")
        .eq("id", id)
        .single(),
      supabase
        .from("lab_samples")
        .select("id, barcode, patient_id, sample_type, position, collection_date, notes, discarded_at, created_at")
        .eq("rack_id", id)
        .is("discarded_at", null)
        .order("position"),
    ]);

    if (rackRes.error) throw rackRes.error;

    const samples = samplesRes.data ?? [];
    return NextResponse.json({
      rack: { ...rackRes.data, total_samples: samples.length },
      samples,
    });
  } catch (err) {
    console.error("[samples/racks/[id]/GET]", err);
    return NextResponse.json({ error: "Failed to fetch rack" }, { status: 500 });
  }
}

/** POST /api/samples/racks/:id  →  add a sample to this rack */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: rack_id } = await params;
  try {
    const body = await req.json();
    const { barcode, patient_id, sample_type, position, collection_date, notes } = body;
    if (!barcode) return NextResponse.json({ error: "barcode required" }, { status: 400 });
    if (position === undefined || position === null)
      return NextResponse.json({ error: "position required" }, { status: 400 });

    const supabase = createClient();

    /* Get facility_id from the rack */
    const { data: rack } = await supabase
      .from("lab_racks")
      .select("facility_id, rack_type")
      .eq("id", rack_id)
      .single();
    if (!rack) return NextResponse.json({ error: "Rack not found" }, { status: 404 });

    const capacity = rack.rack_type === "igra" ? 40 : 100;
    if (position < 0 || position >= capacity)
      return NextResponse.json({ error: `Position must be 0–${capacity - 1}` }, { status: 400 });

    /* Check position is free */
    const { data: posOccupied } = await supabase
      .from("lab_samples")
      .select("id")
      .eq("rack_id", rack_id)
      .eq("position", position)
      .is("discarded_at", null)
      .maybeSingle();
    if (posOccupied) return NextResponse.json({ error: "Position already occupied" }, { status: 400 });

    /* Check barcode uniqueness within facility */
    const { data: barcodeExists } = await supabase
      .from("lab_samples")
      .select("id")
      .eq("facility_id", rack.facility_id)
      .eq("barcode", barcode)
      .maybeSingle();
    if (barcodeExists) return NextResponse.json({ error: `Barcode "${barcode}" already exists` }, { status: 400 });

    const { data: sample, error } = await supabase
      .from("lab_samples")
      .insert({
        rack_id,
        facility_id: rack.facility_id,
        barcode,
        patient_id: patient_id || null,
        sample_type: sample_type || null,
        position,
        collection_date: collection_date || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ sample }, { status: 201 });
  } catch (err) {
    console.error("[samples/racks/[id]/POST]", err);
    return NextResponse.json({ error: "Failed to add sample" }, { status: 500 });
  }
}

/** DELETE /api/samples/racks/:id  →  delete this rack and all its samples */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const supabase = createClient();
    const { error } = await supabase.from("lab_racks").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[samples/racks/[id]/DELETE]", err);
    return NextResponse.json({ error: "Failed to delete rack" }, { status: 500 });
  }
}
