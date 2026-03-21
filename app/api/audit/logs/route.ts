/**
 * GET /api/audit/logs — Operational audit log (admin only)
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const action = searchParams.get("action");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

  if (!supabaseConfigured) {
    return NextResponse.json({ rows: [], total: 0 });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    let query = db
      .from("audit_log")
      .select("id, table_name, record_id, action, old_data, new_data, actor_id, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (facilityId) query = query.eq("facility_id", facilityId);
    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", endDate + "T23:59:59");
    if (action?.trim()) query = query.ilike("action", `%${action.trim()}%`);

    const { data, error, count } = await query;

    if (error) throw error;

    const rows = (data ?? []).map((r) => ({
      id: r.id,
      user_id: r.actor_id,
      username: r.actor_id,
      action: r.action,
      table_name: r.table_name,
      record_id: r.record_id,
      old_values: r.old_data,
      new_values: r.new_data,
      ip_address: null,
      created_at: r.created_at,
    }));

    return NextResponse.json({ rows, total: count ?? rows.length });
  } catch (err) {
    console.error("[GET /api/audit/logs]", err);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
