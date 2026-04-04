/**
 * GET /api/console/audit — Cross-facility audit log (super-admin only). ENG-159
 *
 * Query: facility_id?, action?, from?, to?, actor?, cursor? (offset string for pagination)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, jsonError } from "@/lib/auth/server";
import { summariseAuditAction } from "@/lib/audit";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

const PAGE = 50;

type AuditRow = {
  id: string;
  created_at: string;
  facility_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  record_id: string | null;
  table_name: string;
  old_data: unknown;
  new_data: unknown;
  hospitals?: { name: string } | { name: string }[] | null;
};

async function buildEmailMap(
  adminAuth: {
    listUsers: (o: { page?: number; perPage?: number }) => Promise<unknown>;
    getUserById: (id: string) => Promise<{ data?: { user?: { id: string; email?: string } } }>;
  },
  userIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return map;

  try {
    const listResult = await adminAuth.listUsers({ page: 1, perPage: 1000 });
    const lr = listResult as { data?: { users?: Array<{ id: string; email?: string }> } };
    for (const u of lr.data?.users ?? []) {
      map.set(u.id, u.email ?? "");
    }
  } catch (e) {
    console.error("[GET /api/console/audit] listUsers", e);
  }

  const missing = unique.filter((id) => !map.has(id));
  await Promise.all(
    missing.map(async (id) => {
      try {
        const { data } = await adminAuth.getUserById(id);
        const email = data?.user?.email ?? "";
        map.set(id, email);
      } catch {
        map.set(id, "");
      }
    })
  );

  return map;
}

function facilityNameFromRow(row: AuditRow): string | null {
  const h = row.hospitals;
  if (!h) return null;
  const o = Array.isArray(h) ? h[0] : h;
  return o?.name ?? null;
}

export async function GET(req: NextRequest) {
  if (!supabaseConfigured) {
    return NextResponse.json({ rows: [], nextCursor: null });
  }

  const ctx = await getAuthContext(req);
  if (!ctx.user) return jsonError("Unauthorized", 401);
  if (!ctx.isSuperAdmin) return jsonError("Forbidden", 403);

  const sp = req.nextUrl.searchParams;
  const facilityId = sp.get("facility_id")?.trim() || "";
  const actionQ = sp.get("action")?.trim() || "";
  const fromQ = sp.get("from")?.trim() || "";
  const toQ = sp.get("to")?.trim() || "";
  const actorQ = sp.get("actor")?.trim() || "";
  const cursor = sp.get("cursor")?.trim() || "";
  const offset = Math.max(0, parseInt(cursor, 10) || 0);

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const authAdmin = (
      db.auth as {
        admin?: {
          listUsers: (o: { page?: number; perPage?: number }) => Promise<unknown>;
          getUserById: (id: string) => Promise<{ data?: { user?: { id: string; email?: string } } }>;
        };
      }
    ).admin;

    if (!authAdmin) {
      return NextResponse.json({ error: "Auth admin unavailable" }, { status: 500 });
    }

    let actorUserIds: string[] | null = null;
    if (actorQ) {
      try {
        const listResult = await authAdmin.listUsers({ page: 1, perPage: 1000 });
        const lr = listResult as { data?: { users?: Array<{ id: string; email?: string }> } };
        const needle = actorQ.toLowerCase();
        actorUserIds =
          (lr.data?.users ?? [])
            .filter((u) => (u.email ?? "").toLowerCase().includes(needle))
            .map((u) => u.id) ?? [];
      } catch (e) {
        console.error("[GET /api/console/audit] actor filter listUsers", e);
        actorUserIds = [];
      }
      if (actorUserIds.length === 0) {
        return NextResponse.json({ rows: [], nextCursor: null });
      }
    }

    const selectWithHospital = `
      id,
      created_at,
      facility_id,
      user_id,
      action,
      entity_type,
      record_id,
      table_name,
      old_data,
      new_data,
      hospitals ( name )
    `;

    let q = db.from("audit_log").select(selectWithHospital).order("created_at", { ascending: false });

    if (facilityId) {
      q = q.eq("facility_id", facilityId);
    }
    if (actionQ) {
      q = q.ilike("action", `%${actionQ}%`);
    }
    if (fromQ) {
      const start = new Date(fromQ);
      if (!Number.isNaN(start.getTime())) q = q.gte("created_at", start.toISOString());
    }
    if (toQ) {
      const end = new Date(toQ);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        q = q.lte("created_at", end.toISOString());
      }
    }
    if (actorUserIds) {
      q = q.in("user_id", actorUserIds);
    }

    const fetchEnd = offset + PAGE;
    let { data: rawRows, error } = await q.range(offset, fetchEnd);

    if (error) {
      const msg = (error.message ?? "").toLowerCase();
      if (msg.includes("hospitals") || msg.includes("schema") || msg.includes("relationship")) {
        let q2 = db
          .from("audit_log")
          .select(
            "id, created_at, facility_id, user_id, action, entity_type, record_id, table_name, old_data, new_data"
          )
          .order("created_at", { ascending: false });
        if (facilityId) q2 = q2.eq("facility_id", facilityId);
        if (actionQ) q2 = q2.ilike("action", `%${actionQ}%`);
        if (fromQ) {
          const start = new Date(fromQ);
          if (!Number.isNaN(start.getTime())) q2 = q2.gte("created_at", start.toISOString());
        }
        if (toQ) {
          const end = new Date(toQ);
          if (!Number.isNaN(end.getTime())) {
            end.setHours(23, 59, 59, 999);
            q2 = q2.lte("created_at", end.toISOString());
          }
        }
        if (actorUserIds) q2 = q2.in("user_id", actorUserIds);
        const second = await q2.range(offset, fetchEnd);
        rawRows = second.data as typeof rawRows;
        error = second.error;
      }
    }

    if (error) throw error;

    const rowsIn = (rawRows ?? []) as AuditRow[];
    const hasMore = rowsIn.length > PAGE;
    const pageRows = hasMore ? rowsIn.slice(0, PAGE) : rowsIn;

    const needNames = pageRows.some((r) => !facilityNameFromRow(r) && r.facility_id);
    const facilityNameById = new Map<string, string>();
    if (needNames) {
      const ids = [...new Set(pageRows.map((r) => r.facility_id).filter(Boolean))] as string[];
      const { data: hs } = await db.from("hospitals").select("id, name").in("id", ids);
      for (const h of hs ?? []) {
        facilityNameById.set((h as { id: string; name: string }).id, (h as { name: string }).name);
      }
    }

    const userIds = pageRows.map((r) => r.user_id).filter(Boolean) as string[];
    const emailMap = await buildEmailMap(authAdmin, userIds);

    const rows = pageRows.map((r) => {
      const facilityName =
        facilityNameFromRow(r) ?? (r.facility_id ? facilityNameById.get(r.facility_id) ?? null : null);
      return {
        id: r.id,
        created_at: r.created_at,
        facility_id: r.facility_id,
        facility_name: facilityName,
        user_id: r.user_id,
        actor_email: r.user_id ? emailMap.get(r.user_id) ?? "" : "",
        action: r.action,
        entity_type: r.entity_type,
        record_id: r.record_id,
        table_name: r.table_name,
        summary: summariseAuditAction({
          action: r.action,
          entity_type: r.entity_type,
          table_name: r.table_name,
          old_data: r.old_data,
          new_data: r.new_data,
        }),
      };
    });

    const nextCursor = hasMore ? String(offset + PAGE) : null;

    return NextResponse.json({ rows, nextCursor });
  } catch (e) {
    console.error("[GET /api/console/audit]", e);
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }
}
