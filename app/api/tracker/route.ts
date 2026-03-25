/**
 * GET /api/tracker — Tracker table (paginated test requests with TAT details)
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const offset = (page - 1) * limit;
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const shift = searchParams.get("shift");
  const section = searchParams.get("section");

  if (!facilityId) {
    return NextResponse.json(
      { error: "facility_id required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ data: [], total: 0, page, limit });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    let query = db
      .from("test_requests")
      .select("*", { count: "exact" })
      .eq("facility_id", facilityId)
      .order("requested_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (dateFrom) query = query.gte("requested_at", dateFrom);
    if (dateTo) query = query.lte("requested_at", dateTo + "T23:59:59");
    if (shift) query = query.eq("shift", shift);
    if (section && section !== "all") query = query.eq("section", section);

    const { data, error, count } = await query;

    if (error) throw error;

    const items = (data ?? []).map((r) => {
      const received = r.received_at ? new Date(r.received_at) : null;
      const resulted = r.resulted_at ? new Date(r.resulted_at) : null;
      let tatMinutes: number | null = null;
      if (received && resulted) {
        tatMinutes = Math.floor((resulted.getTime() - received.getTime()) / 60000);
      }
      return {
        id: r.id,
        lab_number: r.lab_number,
        test_name: r.test_name,
        section: r.section,
        priority: r.priority,
        shift: r.shift,
        unit: r.unit,
        requested_at: r.requested_at,
        received_at: r.received_at,
        resulted_at: r.resulted_at,
        status: r.status,
        tat_minutes: tatMinutes,
      };
    });

    return NextResponse.json({
      data: items,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    console.error("[GET /api/tracker]", err);
    return NextResponse.json(
      { error: "Failed to fetch tracker data" },
      { status: 500 }
    );
  }
}
