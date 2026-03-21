/**
 * GET /api/admin/targets/tests — Get monthly tests target
 * POST /api/admin/targets/tests — Set monthly tests target
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  if (!facilityId || !month || !year) {
    return NextResponse.json({ error: "facility_id, month, year required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ target: 10000 });
  }

  try {
    const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data } = await db
      .from("tests_targets")
      .select("target")
      .eq("facility_id", facilityId)
      .eq("period", "monthly")
      .eq("period_start", periodStart)
      .single();

    return NextResponse.json({ target: data?.target ?? 10000 });
  } catch (err) {
    console.error("[GET /api/admin/targets/tests]", err);
    return NextResponse.json({ target: 10000 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { facility_id, month, year, target } = body;

  if (!facility_id || !month || !year || target === undefined) {
    return NextResponse.json(
      { error: "facility_id, month, year, target required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ ok: true });
  }

  try {
    const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    await db.from("tests_targets").upsert(
      {
        facility_id,
        period: "monthly",
        period_start: periodStart,
        target: parseInt(String(target), 10) || 0,
      },
      { onConflict: "facility_id,period,period_start" }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/admin/targets/tests]", err);
    return NextResponse.json({ error: "Failed to save target" }, { status: 500 });
  }
}
