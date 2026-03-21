/**
 * GET /api/tat/queue — real-time TAT queue (in-progress tests)
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
    return NextResponse.json({ data: [], error: null });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data, error } = await db
      .from("test_requests")
      .select("*")
      .eq("facility_id", facilityId)
      .in("status", ["received", "in_progress"])
      .order("received_at", { ascending: true, nullsFirst: false });

    if (error) throw error;

    const now = new Date();
    const withElapsed = (data ?? []).map((r) => {
      const received = r.received_at ? new Date(r.received_at) : null;
      const elapsed = received ? Math.floor((now.getTime() - received.getTime()) / 60000) : null;
      return { ...r, elapsed_minutes: elapsed };
    });

    return NextResponse.json({ data: withElapsed, error: null });
  } catch (err) {
    console.error("[GET /api/tat/queue]", err);
    return NextResponse.json(
      { data: null, error: "Failed to fetch TAT queue" },
      { status: 500 }
    );
  }
}
