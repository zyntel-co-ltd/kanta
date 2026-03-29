/**
 * GET/POST /api/admin/config/sections — Lab sections per facility (ENG-85)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAuthContext,
  requireAdminPanel,
  requireAuth,
  requireFacilityAccess,
} from "@/lib/auth/server";
import { writeAuditLog } from "@/lib/audit";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "_");
}

export async function GET(req: NextRequest) {
  const facilityId = new URL(req.url).searchParams.get("facility_id");
  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }
  if (!supabaseConfigured) {
    return NextResponse.json([]);
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;
  const accessErr = requireFacilityAccess(ctx, facilityId);
  if (accessErr) return accessErr;

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();
    const { data, error } = await db
      .from("lab_sections")
      .select("id, facility_id, name, abbreviation, code, is_active, sort_order, created_at")
      .eq("facility_id", facilityId)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("[GET /api/admin/config/sections]", e);
    return NextResponse.json({ error: "Failed to list sections" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const facilityId = typeof body.facility_id === "string" ? body.facility_id : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const abbreviation = typeof body.abbreviation === "string" ? body.abbreviation.trim() : "";
  const code = typeof body.code === "string" ? normalizeCode(body.code) : "";

  if (!facilityId || !name || !abbreviation || !code) {
    return NextResponse.json(
      { error: "facility_id, name, abbreviation, and code are required" },
      { status: 400 }
    );
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ id: "mock" }, { status: 201 });
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const denied = requireAdminPanel(ctx, facilityId);
  if (denied) return denied;

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: maxRow } = await db
      .from("lab_sections")
      .select("sort_order")
      .eq("facility_id", facilityId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sortOrder = (maxRow?.sort_order ?? 0) + 1;

    const { data, error } = await db
      .from("lab_sections")
      .insert({
        facility_id: facilityId,
        name,
        abbreviation,
        code,
        is_active: true,
        sort_order: sortOrder,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Section code already exists" }, { status: 409 });
      }
      throw error;
    }

    await writeAuditLog({
      facilityId,
      userId: ctx.user?.id ?? null,
      action: "lab_section.created",
      entityType: "lab_section",
      entityId: data?.id ?? null,
      newValue: { name, abbreviation, code },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error("[POST /api/admin/config/sections]", e);
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
  }
}
