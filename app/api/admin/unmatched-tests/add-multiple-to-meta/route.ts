/**
 * POST /api/admin/unmatched-tests/add-multiple-to-meta — Add multiple unmatched tests to Meta
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAdminPanel } from "@/lib/auth/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { items } = body as { items: Array<{ id: string; labSection: string; tat: number; price: number }> };

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "items array required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ results: items.map(() => ({ success: true })) });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: firstRow } = await db
      .from("unmatched_tests")
      .select("facility_id")
      .eq("id", items[0].id)
      .single();

    if (!firstRow?.facility_id) {
      return NextResponse.json({ error: "First item not found" }, { status: 400 });
    }

    const ctx = await getAuthContext(req, {
      facilityIdHint: firstRow.facility_id as string,
    });
    const denied = requireAdminPanel(ctx, firstRow.facility_id as string);
    if (denied) return denied;

    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const item of items) {
      if (!item.id || !item.labSection || item.price <= 0) {
        results.push({ id: item.id, success: false, error: "Invalid item" });
        continue;
      }

      const { data: unmatched, error: fetchErr } = await db
        .from("unmatched_tests")
        .select("facility_id, test_name")
        .eq("id", item.id)
        .single();

      if (fetchErr || !unmatched) {
        results.push({ id: item.id, success: false, error: "Not found" });
        continue;
      }

      const { error: insertErr } = await db.from("test_metadata").insert({
        facility_id: unmatched.facility_id,
        test_name: unmatched.test_name.trim(),
        section: String(item.labSection).trim(),
        price: parseFloat(String(item.price)) || 0,
        tat_minutes: parseInt(String(item.tat), 10) || 60,
      });

      if (insertErr) {
        results.push({ id: item.id, success: false, error: insertErr.message });
        continue;
      }

      await db
        .from("unmatched_tests")
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      results.push({ id: item.id, success: true });
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[POST /api/admin/unmatched-tests/add-multiple-to-meta]", err);
    return NextResponse.json(
      { error: "Failed to add to Meta" },
      { status: 500 }
    );
  }
}
