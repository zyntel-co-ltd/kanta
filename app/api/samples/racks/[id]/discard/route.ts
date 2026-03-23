import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

type Params = { params: Promise<{ id: string }> };

/** POST /api/samples/racks/:id/discard
 *  Marks every non-discarded sample in the rack as discarded (sets discarded_at = now)
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const { id: rack_id } = await params;
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("lab_samples")
      .update({ discarded_at: new Date().toISOString() })
      .eq("rack_id", rack_id)
      .is("discarded_at", null);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[samples/racks/[id]/discard/POST]", err);
    return NextResponse.json({ error: "Failed to discard samples" }, { status: 500 });
  }
}
