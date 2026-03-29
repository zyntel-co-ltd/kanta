import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAdminPanel } from "@/lib/auth/server";
import { writeAuditLog } from "@/lib/audit";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facility_id");
  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({
      id: facilityId,
      name: process.env.NEXT_PUBLIC_HOSPITAL_NAME?.trim() || "Hospital",
      logo_url: null,
      address: null,
      phone: null,
    });
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const denied = requireAdminPanel(ctx, facilityId);
  if (denied) return denied;

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();
    const { data, error } = await db
      .from("hospitals")
      .select("id, name, logo_url, address, phone")
      .eq("id", facilityId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/admin/hospital]", error);
    return NextResponse.json({ error: "Failed to load hospital settings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const facilityId = typeof body.facility_id === "string" ? body.facility_id : "";
  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }

  if (!supabaseConfigured) {
    return NextResponse.json({ ok: true });
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const denied = requireAdminPanel(ctx, facilityId);
  if (denied) return denied;

  const updates: {
    name?: string;
    logo_url?: string | null;
    address?: string | null;
    phone?: string | null;
  } = {};

  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.logo_url === "string" || body.logo_url === null) updates.logo_url = body.logo_url;
  if (typeof body.address === "string" || body.address === null) updates.address = body.address;
  if (typeof body.phone === "string" || body.phone === null) updates.phone = body.phone;

  if (updates.name !== undefined && !updates.name) {
    return NextResponse.json({ error: "Hospital name is required" }, { status: 400 });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: prev } = await db
      .from("hospitals")
      .select("name, logo_url, address, phone")
      .eq("id", facilityId)
      .maybeSingle();

    const { error } = await db.from("hospitals").update(updates).eq("id", facilityId);
    if (error) throw error;

    await writeAuditLog({
      facilityId,
      userId: ctx.user?.id ?? null,
      action: "hospital.settings_updated",
      entityType: "hospital",
      entityId: facilityId,
      oldValue: (prev ?? {}) as Record<string, unknown>,
      newValue: updates as Record<string, unknown>,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/admin/hospital]", error);
    return NextResponse.json({ error: "Failed to save hospital settings" }, { status: 500 });
  }
}
