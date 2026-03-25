/**
 * POST /api/admin/unmatched-tests/:id/add-to-meta — Add unmatched test to test_metadata
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAdminUserManagement } from "@/lib/auth/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { labSection, tat, price } = body;

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  if (!labSection || price === undefined || price <= 0) {
    return NextResponse.json(
      { error: "labSection and price (>0) required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ testName: "mock" });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: unmatched, error: fetchErr } = await db
      .from("unmatched_tests")
      .select("facility_id, test_name")
      .eq("id", id)
      .single();

    if (fetchErr || !unmatched) {
      return NextResponse.json(
        { error: "Unmatched test not found" },
        { status: 404 }
      );
    }

    const ctx = await getAuthContext(req, {
      facilityIdHint: unmatched.facility_id as string,
    });
    const denied = requireAdminUserManagement(ctx, unmatched.facility_id as string);
    if (denied) return denied;

    const { error: insertErr } = await db.from("test_metadata").insert({
      facility_id: unmatched.facility_id,
      test_name: unmatched.test_name.trim(),
      section: String(labSection).trim(),
      price: parseFloat(String(price)) || 0,
      tat_minutes: parseInt(String(tat), 10) || 60,
    });

    if (insertErr) {
      return NextResponse.json(
        { error: insertErr.message || "Failed to add to Meta" },
        { status: 400 }
      );
    }

    await db
      .from("unmatched_tests")
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ testName: unmatched.test_name });
  } catch (err) {
    console.error("[POST /api/admin/unmatched-tests/:id/add-to-meta]", err);
    return NextResponse.json(
      { error: "Failed to add to Meta" },
      { status: 500 }
    );
  }
}
