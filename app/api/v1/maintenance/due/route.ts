/**
 * GET /api/v1/maintenance/due — maintenance due view (equipment + schedule joined)
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");

  if (!facilityId) {
    return NextResponse.json(
      { data: null, error: "facility_id is required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ data: null, error: "Supabase not configured" }, { status: 501 });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: equipment } = await db
      .from("equipment")
      .select(`
        id, name, model, category, status, next_maintenance_at,
        department:departments(id, name)
      `)
      .eq("facility_id", facilityId);

    const { data: schedules } = await db
      .from("maintenance_schedule")
      .select("equipment_id, last_maintained_at, next_due_at, interval_days, notes")
      .eq("facility_id", facilityId);

    const scheduleMap = new Map(
      (schedules ?? []).map((s) => [s.equipment_id, s])
    );

    const merged = (equipment ?? []).map((eq) => {
      const sched = scheduleMap.get(eq.id);
      const nextDue = sched?.next_due_at ?? eq.next_maintenance_at;
      return {
        ...eq,
        last_maintained_at: sched?.last_maintained_at ?? null,
        next_due_at: nextDue,
        interval_days: sched?.interval_days ?? 90,
        notes: sched?.notes ?? null,
      };
    });

    return NextResponse.json({ data: merged, error: null });
  } catch (err) {
    console.error("[GET /api/v1/maintenance/due]", err);
    return NextResponse.json(
      { data: null, error: "Failed to fetch maintenance due" },
      { status: 500 }
    );
  }
}
