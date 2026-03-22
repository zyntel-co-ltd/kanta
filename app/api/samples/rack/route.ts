import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const supabase = createClient();
    const { error } = await supabase.from("lab_racks").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[samples/rack/DELETE]", err);
    return NextResponse.json({ error: "Failed to delete rack" }, { status: 500 });
  }
}
