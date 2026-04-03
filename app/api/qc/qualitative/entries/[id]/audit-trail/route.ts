/**
 * GET /api/qc/qualitative/entries/:id/audit-trail — ISO-oriented timeline for one incident
 * (this entry plus linked rerun / originating failed run) within a facility.
 */

import { NextRequest, NextResponse } from "next/server";
import { AUDIT_APP_TABLE } from "@/lib/audit";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ events: [] });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: entry, error: entryErr } = await db
      .from("qualitative_qc_entries")
      .select("id, facility_id, rerun_for_entry_id, rerun_entry_id")
      .eq("id", id)
      .single();

    if (entryErr || !entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    if (entry.facility_id !== facilityId) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const relatedIds = [
      entry.id as string,
      entry.rerun_for_entry_id as string | null,
      entry.rerun_entry_id as string | null,
    ].filter((x): x is string => typeof x === "string" && x.length > 0);

    const uniqueIds = [...new Set(relatedIds)];

    const { data: rows, error } = await db
      .from("audit_log")
      .select("id, action, record_id, entity_type, old_data, new_data, user_id, created_at")
      .eq("facility_id", facilityId)
      .eq("table_name", AUDIT_APP_TABLE)
      .in("record_id", uniqueIds)
      .like("action", "qc.qual_entry%")
      .order("created_at", { ascending: true });

    if (error) throw error;

    const events = (rows ?? []).map((r) => ({
      id: r.id,
      created_at: r.created_at,
      action: r.action,
      record_id: r.record_id,
      entity_type: r.entity_type,
      user_id: r.user_id,
      old_data: r.old_data,
      new_data: r.new_data,
    }));

    return NextResponse.json({ events });
  } catch (err) {
    console.error("[GET /api/qc/qualitative/entries/:id/audit-trail]", err);
    return NextResponse.json(
      { error: "Failed to load audit trail" },
      { status: 500 }
    );
  }
}
