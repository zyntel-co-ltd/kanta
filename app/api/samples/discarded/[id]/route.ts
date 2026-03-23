import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

type Params = { params: { id: string } };

/** DELETE /api/samples/discarded/:id
 *  Permanently removes a discarded sample record.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("lab_samples")
      .delete()
      .eq("id", id)
      .not("discarded_at", "is", null);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[samples/discarded/[id]/DELETE]", err);
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
  }
}
