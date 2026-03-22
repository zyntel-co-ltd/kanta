import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facility_id = searchParams.get("facility_id") || DEFAULT_FACILITY_ID;
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const unread_only = searchParams.get("unread_only") === "true";

  try {
    const supabase = createClient();
    let query = supabase
      .from("operational_alerts")
      .select("id, alert_type, title, description, severity, source_modules, acknowledged_at, created_at")
      .eq("facility_id", facility_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unread_only) {
      query = query.is("acknowledged_at", null);
    }

    const { data, error } = await query;
    if (error) throw error;

    const unreadCount = (data ?? []).filter((a) => !a.acknowledged_at).length;
    return NextResponse.json({ alerts: data ?? [], unread_count: unreadCount });
  } catch (err) {
    console.error("[alerts GET]", err);
    return NextResponse.json({ alerts: [], unread_count: 0, error: "Failed to fetch alerts" }, { status: 500 });
  }
}

/* PATCH /:id — acknowledge an alert */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { id, acknowledge_all, facility_id = DEFAULT_FACILITY_ID } = body;

  try {
    const supabase = createClient();
    const now = new Date().toISOString();

    if (acknowledge_all) {
      const { error } = await supabase
        .from("operational_alerts")
        .update({ acknowledged_at: now })
        .eq("facility_id", facility_id)
        .is("acknowledged_at", null);
      if (error) throw error;
      return NextResponse.json({ success: true, acknowledged: "all" });
    }

    if (id) {
      const { error } = await supabase
        .from("operational_alerts")
        .update({ acknowledged_at: now })
        .eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true, acknowledged: id });
    }

    return NextResponse.json({ error: "Provide id or acknowledge_all=true" }, { status: 400 });
  } catch (err) {
    console.error("[alerts PATCH]", err);
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
  }
}
