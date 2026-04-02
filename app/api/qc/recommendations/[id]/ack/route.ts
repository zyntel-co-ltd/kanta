import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/server";
import { writeAuditLog } from "@/lib/audit";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (!supabaseConfigured) return NextResponse.json({ ok: true });

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();
    const ctx = await getAuthContext(req);

    const { data: row } = await db
      .from("qc_lot_recommendations")
      .select("id, facility_id, status")
      .eq("id", id)
      .single();

    if (!row) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
    }

    const { error } = await db
      .from("qc_lot_recommendations")
      .update({
        status: "acknowledged",
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: ctx.user?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;

    await writeAuditLog({
      facilityId: row.facility_id,
      userId: ctx.user?.id ?? null,
      action: "qc.lot_review_acknowledged",
      entityType: "qc_lot_recommendation",
      entityId: id,
      oldValue: { status: row.status },
      newValue: { status: "acknowledged" },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/qc/recommendations/:id/ack]", err);
    return NextResponse.json({ error: "Failed to acknowledge recommendation" }, { status: 500 });
  }
}
