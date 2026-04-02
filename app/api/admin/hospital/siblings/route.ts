/**
 * GET /api/admin/hospital/siblings?facility_id=
 * Read-only sibling branches sharing the same parent_hospital_id (ENG-107).
 * Facility-admin only; returns [] if parent_hospital_id is null or column missing.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAdminPanel } from "@/lib/auth/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const facilityId = req.nextUrl.searchParams.get("facility_id")?.trim();
  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json([]);
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const denied = requireAdminPanel(ctx, facilityId);
  if (denied) return denied;

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: row, error: rowErr } = await db
      .from("hospitals")
      .select("parent_hospital_id")
      .eq("id", facilityId)
      .maybeSingle();

    if (rowErr) {
      const msg = rowErr.message?.toLowerCase() ?? "";
      if (msg.includes("parent_hospital_id") || msg.includes("column") || msg.includes("schema")) {
        return NextResponse.json([]);
      }
      throw rowErr;
    }

    const parentId = (row as { parent_hospital_id?: string | null } | null)?.parent_hospital_id;
    if (!parentId) {
      return NextResponse.json([]);
    }

    const { data: siblings, error: sibErr } = await db
      .from("hospitals")
      .select("id, name, city, tier")
      .eq("parent_hospital_id", parentId)
      .neq("id", facilityId)
      .order("name");

    if (sibErr) {
      const msg = sibErr.message?.toLowerCase() ?? "";
      if (msg.includes("parent_hospital_id") || msg.includes("column")) {
        return NextResponse.json([]);
      }
      throw sibErr;
    }

    return NextResponse.json(siblings ?? []);
  } catch (e) {
    console.error("[GET /api/admin/hospital/siblings]", e);
    return NextResponse.json({ error: "Failed to load sibling branches" }, { status: 500 });
  }
}
