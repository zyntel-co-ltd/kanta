/**
 * POST /api/admin/users/sync — Super-admin only: link auth users missing from facility_users as viewer.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, jsonError } from "@/lib/auth/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function POST(req: NextRequest) {
  if (!supabaseConfigured) {
    return NextResponse.json({ synced: 0 });
  }

  const body = await req.json().catch(() => ({}));
  const facility_id = typeof body.facility_id === "string" ? body.facility_id : "";
  if (!facility_id) {
    return jsonError("facility_id required", 400);
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facility_id });
  if (!ctx.user) return jsonError("Unauthorized", 401);
  if (!ctx.isSuperAdmin) return jsonError("Forbidden", 403);

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const listUsersFn = (
      db.auth as {
        admin?: {
          listUsers: (o: {
            page?: number;
            perPage?: number;
          }) => Promise<{ data?: { users?: Array<{ id: string }> } }>;
        };
      }
    ).admin?.listUsers;
    if (!listUsersFn) {
      return jsonError("Auth admin not available", 500);
    }

    const { data: listData } = await listUsersFn({ page: 1, perPage: 1000 });
    const allAuthUsers = listData?.users ?? [];

    const { data: existingRows, error: exErr } = await db
      .from("facility_users")
      .select("user_id")
      .eq("facility_id", facility_id);

    if (exErr) throw exErr;

    const existing = new Set((existingRows ?? []).map((r) => String(r.user_id)));

    const missing = allAuthUsers.filter((u) => u.id && !existing.has(u.id));

    let synced = 0;
    for (const au of missing) {
      const { error } = await db.from("facility_users").upsert(
        {
          facility_id,
          user_id: au.id,
          role: "viewer",
          is_active: true,
        },
        { onConflict: "facility_id,user_id" }
      );
      if (!error) synced += 1;
    }

    return NextResponse.json({ synced });
  } catch (e) {
    console.error("[POST /api/admin/users/sync]", e);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
