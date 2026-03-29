/**
 * DELETE /api/invites/:id — Cancel pending invite
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getAuthContext, requireAdminPanel } from "@/lib/auth/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ ok: true });
  }

  try {
    const db = createAdminClient();
    const { data: inv, error: invErr } = await db
      .from("facility_invites")
      .select("id, facility_id, accepted_at")
      .eq("id", id)
      .maybeSingle();

    if (invErr || !inv) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (inv.accepted_at) {
      return NextResponse.json({ error: "Cannot cancel an accepted invite" }, { status: 400 });
    }

    const facilityId = inv.facility_id as string;
    const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
    const denied = requireAdminPanel(ctx, facilityId);
    if (denied) return denied;

    const { error: delErr } = await db.from("facility_invites").delete().eq("id", id);
    if (delErr) throw delErr;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/invites/:id]", e);
    return NextResponse.json({ error: "Failed to cancel invite" }, { status: 500 });
  }
}
