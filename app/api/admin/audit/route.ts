/**
 * GET /api/admin/audit — Paginated application audit trail (table_name = audit_app)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAdminPanel } from "@/lib/auth/server";
import { AUDIT_APP_TABLE } from "@/lib/audit";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

type UserMeta = { id: string; email?: string; user_metadata?: Record<string, unknown> };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ rows: [], total: 0, page, limit });
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const denied = requireAdminPanel(ctx, facilityId);
  if (denied) return denied;

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    let q = db
      .from("audit_log")
      .select("*", { count: "exact" })
      .eq("facility_id", facilityId)
      .eq("table_name", AUDIT_APP_TABLE)
      .order("created_at", { ascending: false });

    if (from) {
      const start = new Date(from);
      if (!Number.isNaN(start.getTime())) q = q.gte("created_at", start.toISOString());
    }
    if (to) {
      const end = new Date(to);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        q = q.lte("created_at", end.toISOString());
      }
    }

    const offset = (page - 1) * limit;
    const { data: rows, error, count } = await q.range(offset, offset + limit - 1);

    if (error) throw error;

    const userIds = [
      ...new Set(
        (rows ?? []).map((r: { user_id?: string | null }) => r.user_id).filter(Boolean)
      ),
    ] as string[];

    const displayByUser = new Map<string, string>();
    const emailByUser = new Map<string, string>();

    const authAdmin = (
      db.auth as {
        admin?: { getUserById: (id: string) => Promise<{ data?: { user?: UserMeta } }> };
      }
    ).admin;

    if (authAdmin?.getUserById && userIds.length > 0) {
      await Promise.all(
        userIds.map(async (uid) => {
          try {
            const { data } = await authAdmin.getUserById(uid);
            const u = data?.user;
            if (!u) return;
            const meta = u.user_metadata ?? {};
            const name =
              (typeof meta.full_name === "string" && meta.full_name) ||
              (typeof meta.name === "string" && meta.name) ||
              (typeof meta.display_name === "string" && meta.display_name) ||
              "";
            emailByUser.set(uid, u.email ?? "");
            displayByUser.set(uid, name || (u.email ? u.email.split("@")[0] : "User"));
          } catch {
            /* ignore */
          }
        })
      );
    }

    const enriched = (rows ?? []).map(
      (r: {
        id: string;
        action: string;
        entity_type: string | null;
        record_id: string | null;
        old_data: unknown;
        new_data: unknown;
        user_id: string | null;
        created_at: string;
      }) => ({
        id: r.id,
        action: r.action,
        entity_type: r.entity_type,
        record_id: r.record_id,
        old_value: r.old_data,
        new_value: r.new_data,
        created_at: r.created_at,
        user_id: r.user_id,
        actor_display: r.user_id ? displayByUser.get(r.user_id) ?? "—" : "—",
        actor_email: r.user_id ? emailByUser.get(r.user_id) ?? "" : "",
      })
    );

    return NextResponse.json({
      rows: enriched,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (e) {
    console.error("[GET /api/admin/audit]", e);
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }
}
