/**
 * GET/POST /api/admin/config/shifts — Lab shifts per facility (ENG-85)
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
      .from("lab_shifts")
      .select("id, facility_id, name, start_time, end_time, is_active, created_at")
      .eq("facility_id", facilityId)
      .order("start_time", { ascending: true });
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("[GET /api/admin/config/shifts]", e);
    return NextResponse.json({ error: "Failed to list shifts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const facilityId = typeof body.facility_id === "string" ? body.facility_id : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const startTime = typeof body.start_time === "string" ? body.start_time.trim() : "";
  const endTime = typeof body.end_time === "string" ? body.end_time.trim() : "";

  if (!facilityId || !name || !startTime || !endTime) {
    return NextResponse.json(
      { error: "facility_id, name, start_time, and end_time are required" },
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

    const { data, error } = await db
      .from("lab_shifts")
      .insert({
        facility_id: facilityId,
        name,
        start_time: startTime,
        end_time: endTime,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) throw error;

    await writeAuditLog({
      facilityId,
      userId: ctx.user?.id ?? null,
      action: "lab_shift.created",
      entityType: "lab_shift",
      entityId: data?.id ?? null,
      newValue: { name, start_time: startTime, end_time: endTime },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error("[POST /api/admin/config/shifts]", e);
    return NextResponse.json({ error: "Failed to create shift" }, { status: 500 });
  }
}
