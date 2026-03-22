import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { DEFAULT_FACILITY_ID } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facility_id = searchParams.get("facility_id") || DEFAULT_FACILITY_ID;
  const status = searchParams.get("status") || "";
  const start_date = searchParams.get("start_date") || "";
  const end_date = searchParams.get("end_date") || "";
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  try {
    const supabase = createClient();
    let query = supabase
      .from("lab_racks")
      .select(`
        id, rack_name, rack_date, rack_type, description, status, created_at, updated_at,
        lab_samples(count)
      `)
      .eq("facility_id", facility_id)
      .order("rack_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);
    if (start_date) query = query.gte("rack_date", start_date);
    if (end_date) query = query.lte("rack_date", end_date);

    const { data, error } = await query;
    if (error) throw error;

    const racks = (data ?? []).map((r) => ({
      ...r,
      total_samples: Array.isArray(r.lab_samples) ? r.lab_samples.length : 0,
    }));

    return NextResponse.json({ racks });
  } catch (err) {
    console.error("[samples/GET]", err);
    return NextResponse.json({ error: "Failed to fetch racks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { facility_id = DEFAULT_FACILITY_ID, rack_name, rack_date, rack_type = "normal", description } = body;

    if (!rack_name) return NextResponse.json({ error: "rack_name required" }, { status: 400 });

    const supabase = createClient();
    const { data, error } = await supabase
      .from("lab_racks")
      .insert({ facility_id, rack_name, rack_date: rack_date || new Date().toISOString().slice(0, 10), rack_type, description })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ rack: data }, { status: 201 });
  } catch (err) {
    console.error("[samples/POST]", err);
    return NextResponse.json({ error: "Failed to create rack" }, { status: 500 });
  }
}
