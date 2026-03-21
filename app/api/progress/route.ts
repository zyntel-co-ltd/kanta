/**
 * GET /api/progress — Progress view (lab numbers with status/progress)
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");
  const limit = parseInt(searchParams.get("limit") ?? "100", 10);

  if (!facilityId) {
    return NextResponse.json(
      { error: "facility_id required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ data: [] });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data, error } = await db
      .from("test_requests")
      .select("id, lab_number, test_name, section, status, requested_at, received_at, resulted_at")
      .eq("facility_id", facilityId)
      .order("requested_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const byLab: Record<string, { lab_number: string; tests: unknown[]; status: string }> = {};
    for (const r of data ?? []) {
      const lab = r.lab_number || "—";
      if (!byLab[lab]) {
        byLab[lab] = { lab_number: lab, tests: [], status: "pending" };
      }
      byLab[lab].tests.push(r);
      if (r.status === "resulted" && byLab[lab].status !== "resulted") {
        byLab[lab].status = "resulted";
      } else if (r.status === "in_progress" && byLab[lab].status === "pending") {
        byLab[lab].status = "in_progress";
      } else if (r.status === "received" && byLab[lab].status === "pending") {
        byLab[lab].status = "received";
      }
    }

    const items = Object.values(byLab).map((v) => ({
      ...v,
      requested_at: v.tests[0] ? (v.tests[0] as { requested_at: string }).requested_at : null,
    }));

    return NextResponse.json({ data: items });
  } catch (err) {
    console.error("[GET /api/progress]", err);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}
