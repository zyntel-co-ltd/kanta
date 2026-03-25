/**
 * POST /api/invites/accept — Accept invite (token + password)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

type AuthAdmin = {
  createUser: (opts: {
    email: string;
    password: string;
    email_confirm?: boolean;
    user_metadata?: Record<string, unknown>;
  }) => Promise<{
    data: { user?: { id: string } };
    error: { message?: string } | null;
  }>;
  listUsers: (o: { page?: number; perPage?: number }) => Promise<{
    data?: { users?: Array<{ id: string; email?: string }> };
  }>;
  updateUserById: (
    id: string,
    attrs: { password?: string }
  ) => Promise<{ error: unknown }>;
};

export async function POST(req: NextRequest) {
  if (!supabaseConfigured) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!token || password.length < 8) {
    return NextResponse.json(
      { error: "token and password (min 8 characters) required" },
      { status: 400 }
    );
  }

  const db = createAdminClient();
  const authAdmin = (db.auth as { admin?: AuthAdmin }).admin;

  if (!authAdmin) {
    return NextResponse.json({ error: "Auth admin not available" }, { status: 500 });
  }

  const { data: invite, error: invErr } = await db
    .from("facility_invites")
    .select("id, facility_id, email, role, expires_at, accepted_at")
    .eq("token", token)
    .single();

  if (invErr || !invite) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  }

  if (invite.accepted_at) {
    return NextResponse.json({ error: "Invite already used" }, { status: 400 });
  }

  if (new Date(invite.expires_at as string) < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 400 });
  }

  const email = String(invite.email).toLowerCase();
  const facilityId = invite.facility_id as string;
  const role = invite.role as string;

  let userId: string;

  const { data: created, error: createErr } = await authAdmin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: email.split("@")[0] },
  });

  if (createErr) {
    const msg = (createErr.message || "").toLowerCase();
    const duplicate =
      msg.includes("already") ||
      msg.includes("registered") ||
      msg.includes("exists");
    if (!duplicate) {
      return NextResponse.json(
        { error: createErr.message || "Could not create account" },
        { status: 400 }
      );
    }

    const { data: listData } = await authAdmin.listUsers({ page: 1, perPage: 1000 });
    const existing = (listData?.users ?? []).find(
      (u) => (u.email || "").toLowerCase() === email
    );
    if (!existing?.id) {
      return NextResponse.json(
        { error: "Account exists but could not be linked. Contact support." },
        { status: 400 }
      );
    }
    userId = existing.id;
    const { error: pwdErr } = await authAdmin.updateUserById(userId, { password });
    if (pwdErr) {
      return NextResponse.json({ error: "Could not update password" }, { status: 400 });
    }
  } else if (!created.user?.id) {
    return NextResponse.json({ error: "User created but no id returned" }, { status: 500 });
  } else {
    userId = created.user.id;
  }

  const { data: existingFu } = await db
    .from("facility_users")
    .select("id")
    .eq("facility_id", facilityId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingFu) {
    await db
      .from("facility_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
    return NextResponse.json({ ok: true, user_id: userId, already_member: true });
  }

  const { error: fuErr } = await db.from("facility_users").insert({
    facility_id: facilityId,
    user_id: userId,
    role,
    is_active: true,
  });

  if (fuErr) {
    console.error("[accept invite] facility_users", fuErr);
    return NextResponse.json({ error: "Could not add user to facility" }, { status: 500 });
  }

  await db
    .from("facility_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true, user_id: userId });
}
