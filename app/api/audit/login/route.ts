/**
 * GET /api/audit/login — Login audit (admin only)
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
  const username = searchParams.get("username");
  const success = searchParams.get("success");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

  if (!supabaseConfigured) {
    return NextResponse.json({ rows: [], total: 0 });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    let query = db
      .from("login_audit")
      .select("id, username, user_id, success, ip_address, user_agent, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (facilityId) query = query.eq("facility_id", facilityId);
    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", endDate + "T23:59:59");
    if (username?.trim()) query = query.ilike("username", `%${username.trim()}%`);
    if (success === "true") query = query.eq("success", true);
    if (success === "false") query = query.eq("success", false);

    const { data, error, count } = await query;

    if (error) throw error;

    const rows = (data ?? []).map((r) => ({
      id: r.id,
      username: r.username,
      user_id: r.user_id,
      success: r.success,
      ip_address: r.ip_address,
      user_agent: r.user_agent,
      created_at: r.created_at,
    }));

    return NextResponse.json({ rows, total: count ?? rows.length });
  } catch (err) {
    console.error("[GET /api/audit/login]", err);
    return NextResponse.json(
      { error: "Failed to fetch login audit" },
      { status: 500 }
    );
  }
}
