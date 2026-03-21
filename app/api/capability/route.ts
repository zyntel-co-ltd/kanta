/**
 * GET /api/capability — facility capability profile (for Adaptive Presence)
 * PATCH /api/capability — update capability (admin/manager)
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id") ?? "6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5";

  if (!supabaseConfigured) {
    return NextResponse.json({
      data: {
        facility_id: facilityId,
        has_tat: false,
        has_revenue: false,
        has_refrigerator_monitoring: false,
        has_qc: false,
        has_equipment: true,
      },
      error: null,
    });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data, error } = await db
      .from("facility_capability_profile")
      .select("*")
      .eq("facility_id", facilityId)
      .single();

    if (error || !data) {
      return NextResponse.json({
        data: {
          facility_id: facilityId,
          has_tat: false,
          has_revenue: false,
          has_refrigerator_monitoring: false,
          has_qc: false,
          has_equipment: true,
        },
        error: null,
      });
    }

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error("[GET /api/capability]", err);
    return NextResponse.json(
      { data: null, error: "Failed to fetch capability" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const {
    facility_id,
    has_tat,
    has_revenue,
    has_refrigerator_monitoring,
    has_qc,
    has_equipment,
  } = body;

  if (!facility_id) {
    return NextResponse.json(
      { error: "facility_id required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ ok: true });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const updates: Record<string, boolean> = {};
    if (typeof has_tat === "boolean") updates.has_tat = has_tat;
    if (typeof has_revenue === "boolean") updates.has_revenue = has_revenue;
    if (typeof has_refrigerator_monitoring === "boolean")
      updates.has_refrigerator_monitoring = has_refrigerator_monitoring;
    if (typeof has_qc === "boolean") updates.has_qc = has_qc;
    if (typeof has_equipment === "boolean") updates.has_equipment = has_equipment;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const { error } = await db
      .from("facility_capability_profile")
      .update(updates)
      .eq("facility_id", facility_id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/capability]", err);
    return NextResponse.json(
      { error: "Failed to update capability" },
      { status: 500 }
    );
  }
}
