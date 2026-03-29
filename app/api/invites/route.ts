/**
 * GET /api/invites — Pending invites for a facility (admin panel)
 * POST /api/invites — Create a pending invite
 */

import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getAuthContext, requireAdminPanel } from "@/lib/auth/server";
import {
  FACILITY_ROLES,
  assignableFacilityRoles,
  isFacilityRole,
  type FacilityRole,
} from "@/lib/auth/roles";
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

export async function GET(req: NextRequest) {
  if (!supabaseConfigured) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(req.url);
  const facility_id = searchParams.get("facility_id");
  if (!facility_id) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facility_id });
  const denied = requireAdminPanel(ctx, facility_id);
  if (denied) return denied;

  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("facility_invites")
      .select("id, email, role, token, expires_at, created_at, accepted_at")
      .eq("facility_id", facility_id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("[GET /api/invites]", e);
    return NextResponse.json({ error: "Failed to list invites" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!supabaseConfigured) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const facility_id = typeof body.facility_id === "string" ? body.facility_id : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const roleRaw = body.role;
  const role: FacilityRole =
    isFacilityRole(roleRaw) && FACILITY_ROLES.includes(roleRaw) ? roleRaw : "lab_technician";

  if (!facility_id || !email || !email.includes("@")) {
    return NextResponse.json(
      { error: "facility_id and valid email required" },
      { status: 400 }
    );
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facility_id });
  const denied = requireAdminPanel(ctx, facility_id);
  if (denied) return denied;

  const allowed = assignableFacilityRoles(ctx.role, ctx.isSuperAdmin);
  if (!allowed.includes(role)) {
    return NextResponse.json({ error: "You cannot assign this role" }, { status: 403 });
  }

  const db = createAdminClient();

  const { data: hospital } = await db
    .from("hospitals")
    .select("name")
    .eq("id", facility_id)
    .single();

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data: invite, error } = await db
    .from("facility_invites")
    .insert({
      facility_id,
      email,
      role,
      token,
      invited_by: ctx.user?.id ?? null,
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[POST /api/invites]", error);
    return NextResponse.json({ error: "Could not create invite" }, { status: 500 });
  }

  const inviteUrl = `${appOrigin(req)}/invite/${token}`;

  const sendResult = await sendFacilityInviteEmail({
    to: email,
    inviteUrl,
    facilityName: hospital?.name as string | undefined,
  });

  return NextResponse.json({
    id: invite?.id,
    invite_url: inviteUrl,
    email_sent: sendResult.ok,
  });
}
