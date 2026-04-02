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
      tier: null,
      city: null,
      country: null,
      parent_hospital_id: null,
      group_id: null,
      branch_name: null,
      group_name: null,
      group_slug: null,
    });
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const denied = requireAdminPanel(ctx, facilityId);
  if (denied) return denied;

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const selectWithParent = `id, name, logo_url, address, phone, tier, city, country, group_id, branch_name, parent_hospital_id, hospital_groups ( id, name, slug )`;
    const selectWithoutParent = `id, name, logo_url, address, phone, tier, city, country, group_id, branch_name, hospital_groups ( id, name, slug )`;

    let data: unknown = null;
    let error: { message?: string } | null = null;

    const first = await db.from("hospitals").select(selectWithParent).eq("id", facilityId).maybeSingle();
    data = first.data;
    error = first.error;

    if (error) {
      const msg = (error.message ?? "").toLowerCase();
      if (
        msg.includes("parent_hospital_id") ||
        (msg.includes("column") && msg.includes("does not exist")) ||
        msg.includes("schema cache")
      ) {
        const second = await db
          .from("hospitals")
          .select(selectWithoutParent)
          .eq("id", facilityId)
          .maybeSingle();
        data = second.data;
        error = second.error;
      }
    }

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const raw = data as {
      id: string;
      name: string;
      logo_url: string | null;
      address: string | null;
      phone: string | null;
      tier: string | null;
      city: string | null;
      country: string | null;
      group_id: string | null;
      branch_name: string | null;
      parent_hospital_id?: string | null;
      hospital_groups?:
        | { id: string; name: string; slug: string }
        | { id: string; name: string; slug: string }[]
        | null;
    };
    const hgRaw = raw.hospital_groups;
    const hg = Array.isArray(hgRaw) ? hgRaw[0] : hgRaw;
    return NextResponse.json({
      id: raw.id,
      name: raw.name,
      logo_url: raw.logo_url,
      address: raw.address,
      phone: raw.phone,
      tier: raw.tier,
      city: raw.city ?? null,
      country: raw.country ?? null,
      parent_hospital_id: raw.parent_hospital_id ?? null,
      group_id: raw.group_id,
      branch_name: raw.branch_name,
      group_name: hg?.name ?? null,
      group_slug: hg?.slug ?? null,
    });
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
    city?: string | null;
    country?: string | null;
    branch_name?: string | null;
  } = {};

  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.logo_url === "string" || body.logo_url === null) updates.logo_url = body.logo_url;
  if (typeof body.address === "string" || body.address === null) updates.address = body.address;
  if (typeof body.phone === "string" || body.phone === null) updates.phone = body.phone;
  if (typeof body.city === "string" || body.city === null) {
    updates.city = typeof body.city === "string" ? body.city.trim() || null : null;
  }
  if (typeof body.country === "string" || body.country === null) {
    updates.country = typeof body.country === "string" ? body.country.trim() || null : null;
  }

  if (updates.name !== undefined && !updates.name) {
    return NextResponse.json({ error: "Hospital name is required" }, { status: 400 });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: prev } = await db
      .from("hospitals")
      .select("name, logo_url, address, phone, city, country, group_id")
      .eq("id", facilityId)
      .maybeSingle();

    if (body.branch_name !== undefined) {
      const bn =
        body.branch_name === null
          ? null
          : typeof body.branch_name === "string"
            ? body.branch_name.trim() || null
            : undefined;
      if (bn !== undefined) {
        if (ctx.isSuperAdmin) {
          updates.branch_name = bn;
        } else if (prev?.group_id) {
          updates.branch_name = bn;
        }
      }
    }

    const { error } = await db.from("hospitals").update(updates).eq("id", facilityId);
    if (error) throw error;

    await writeAuditLog({
      facilityId,
      userId: ctx.user?.id ?? null,
      action: "hospital.settings_updated",
      entityType: "hospital",
      entityId: facilityId,
      oldValue: (prev ?? {}) as Record<string, unknown>,
      newValue: { ...updates } as Record<string, unknown>,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH /api/admin/hospital]", error);
    return NextResponse.json({ error: "Failed to save hospital settings" }, { status: 500 });
  }
}
