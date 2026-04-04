/**
 * POST /api/admin/users/sync — Super-admin only: link auth users missing from facility_users as viewer.
 *
 * listUsers returns `{ data: { users: User[] }, error }` — use `data?.users ?? []`, not `data` as the array.
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
  const facility_id = typeof body.facility_id === "string" ? body.facility_id.trim() : "";
  if (!facility_id) {
    return jsonError("facility_id required", 400);
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facility_id });
  if (!ctx.user) return jsonError("Unauthorized", 401);
  /** ENG-160: Cross-tenant user linking — super-admin only (UI also gates `AdminUsersSection`). */
  if (!ctx.isSuperAdmin) return jsonError("Forbidden", 403);

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const adminAuth = (
      db.auth as {
        admin?: {
          listUsers: (o: {
            page?: number;
            perPage?: number;
          }) => Promise<{
            data: { users: Array<{ id: string }> } | null;
            error: { message?: string } | null;
          }>;
        };
      }
    ).admin;

    if (!adminAuth) {
      return jsonError("Auth admin not available", 500);
    }

    const { data, error: listError } = await adminAuth.listUsers({ page: 1, perPage: 1000 });
    if (listError) {
      console.error("[POST /api/admin/users/sync] listUsers:", listError.message);
      return NextResponse.json(
        { error: listError.message ?? "listUsers failed", synced: 0 },
        { status: 500 }
      );
    }
    const allAuthUsers: Array<{ id: string }> = data?.users ?? [];

    const { data: existing, error: exErr } = await db
      .from("facility_users")
      .select("user_id")
      .eq("facility_id", facility_id);

    if (exErr) {
      console.error("[POST /api/admin/users/sync] facility_users:", exErr.message);
      return NextResponse.json({ error: exErr.message, synced: 0 }, { status: 500 });
    }

    const existingIds = new Set((existing ?? []).map((r) => String(r.user_id)));
    const missing = allAuthUsers.filter((u) => u.id && !existingIds.has(u.id));

    if (missing.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    const rows = missing.map((u) => ({
      facility_id,
      user_id: u.id,
      role: "viewer" as const,
      is_active: true,
    }));

    const { error: upsertError } = await db
      .from("facility_users")
      .upsert(rows, { onConflict: "facility_id,user_id" });

    if (upsertError) {
      console.error("[POST /api/admin/users/sync] upsert:", upsertError.message);
      return NextResponse.json({ error: upsertError.message, synced: 0 }, { status: 500 });
    }

    return NextResponse.json({ synced: missing.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/admin/users/sync] unexpected:", msg);
    return NextResponse.json({ error: "Sync failed", synced: 0 }, { status: 500 });
  }
}
