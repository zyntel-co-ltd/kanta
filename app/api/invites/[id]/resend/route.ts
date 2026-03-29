/**
 * POST /api/invites/:id/resend — Resend invite email (same token)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getAuthContext, requireAdminPanel } from "@/lib/auth/server";
import { sendFacilityInviteEmail } from "@/lib/email/send-facility-invite";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

function appOrigin(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    req.headers.get("origin") ||
    (typeof req.nextUrl?.origin === "string" ? req.nextUrl.origin : "") ||
    "http://localhost:3000"
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  try {
    const db = createAdminClient();
    const { data: inv, error: invErr } = await db
      .from("facility_invites")
      .select("id, facility_id, email, token, accepted_at, expires_at")
      .eq("id", id)
      .maybeSingle();

    if (invErr || !inv) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (inv.accepted_at) {
      return NextResponse.json({ error: "Invite already accepted" }, { status: 400 });
    }

    const facilityId = inv.facility_id as string;
    const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
    const denied = requireAdminPanel(ctx, facilityId);
    if (denied) return denied;

    if (new Date(inv.expires_at as string) < new Date()) {
      return NextResponse.json({ error: "Invite expired — cancel and send a new one" }, { status: 400 });
    }

    const { data: hospital } = await db
      .from("hospitals")
      .select("name")
      .eq("id", facilityId)
      .single();

    const inviteUrl = `${appOrigin(req)}/invite/${inv.token as string}`;
    const sendResult = await sendFacilityInviteEmail({
      to: String(inv.email),
      inviteUrl,
      facilityName: hospital?.name as string | undefined,
    });

    return NextResponse.json({ ok: true, email_sent: sendResult.ok });
  } catch (e) {
    console.error("[POST /api/invites/:id/resend]", e);
    return NextResponse.json({ error: "Failed to resend" }, { status: 500 });
  }
}
