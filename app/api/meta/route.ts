/**
 * GET /api/meta — Test metadata (catalog: test name, section, price, TAT)
 * Like zyntel-dashboard Meta table.
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");
  const section = searchParams.get("section");
  const search = searchParams.get("search");

  if (!facilityId) {
    return NextResponse.json(
      { error: "facility_id is required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ data: [] });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    let query = db
      .from("test_metadata")
      .select("*")
      .eq("facility_id", facilityId)
      .order("test_name", { ascending: true });

    if (section && section !== "all") {
      query = query.eq("section", section);
    }

    if (search && search.trim()) {
      query = query.ilike("test_name", `%${search.trim()}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    const items = (data ?? []).map((r) => ({
      id: r.id,
      testName: r.test_name,
      section: r.section,
      price: parseFloat(r.price) ?? 0,
      tatMinutes: r.tat_minutes ?? 60,
    }));

    return NextResponse.json({ data: items });
  } catch (err) {
    console.error("[GET /api/meta]", err);
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { facility_id, testName, section, price, tatMinutes } = body;

  if (!facility_id || !testName || !section) {
    return NextResponse.json(
      { error: "facility_id, testName, section required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ data: { id: "mock-1" } }, { status: 201 });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data, error } = await db
      .from("test_metadata")
      .insert({
        facility_id,
        test_name: String(testName).trim(),
        section: String(section).trim(),
        price: parseFloat(price) ?? 0,
        tat_minutes: parseInt(tatMinutes, 10) || 60,
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/meta]", err);
    return NextResponse.json(
      { error: "Failed to create metadata" },
      { status: 500 }
    );
  }
}
