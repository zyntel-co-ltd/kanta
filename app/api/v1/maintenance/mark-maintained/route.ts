/**
 * POST /api/v1/maintenance/mark-maintained — mark equipment as maintained
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { equipment_id, facility_id, notes } = body;

    if (!equipment_id || !facility_id) {
      return NextResponse.json(
        { data: null, error: "equipment_id and facility_id are required" },
        { status: 400 }
      );
    }

    if (!supabaseConfigured) {
      return NextResponse.json({ data: null, error: "Supabase not configured" }, { status: 501 });
    }

    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    // Get existing schedule or create default
    const { data: existing } = await db
      .from("maintenance_schedule")
      .select("id, interval_days, last_maintained_at, notes")
      .eq("equipment_id", equipment_id)
      .eq("facility_id", facility_id)
      .single();

    const now = new Date();
    const intervalDays = existing?.interval_days ?? 90;
    const nextDue = new Date(now);
    nextDue.setDate(nextDue.getDate() + intervalDays);

    if (existing) {
      const { data, error } = await db
        .from("maintenance_schedule")
        .update({
          last_maintained_at: now.toISOString(),
          next_due_at: nextDue.toISOString(),
          notes: notes ?? existing.notes ?? null,
          updated_at: now.toISOString(),
        })
        .eq("equipment_id", equipment_id)
        .eq("facility_id", facility_id)
        .select()
        .single();

      if (error) throw error;

      // Sync equipment.next_maintenance_at
      await db
        .from("equipment")
        .update({ next_maintenance_at: nextDue.toISOString(), updated_at: now.toISOString() })
        .eq("id", equipment_id);

      return NextResponse.json({ data, error: null });
    }

    // Create new schedule
    const { data, error } = await db
      .from("maintenance_schedule")
      .insert({
        equipment_id,
        facility_id,
        interval_days: intervalDays,
        last_maintained_at: now.toISOString(),
        next_due_at: nextDue.toISOString(),
        notes: notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    await db
      .from("equipment")
      .update({ next_maintenance_at: nextDue.toISOString(), updated_at: now.toISOString() })
      .eq("id", equipment_id);

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error("[POST /api/v1/maintenance/mark-maintained]", err);
    return NextResponse.json(
      { data: null, error: "Failed to mark as maintained" },
      { status: 500 }
    );
  }
}
