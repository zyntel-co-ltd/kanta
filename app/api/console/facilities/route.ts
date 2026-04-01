/**
 * GET /api/console/facilities — List all hospitals (Zyntel super-admin only).
 * POST /api/console/facilities — Create hospital (Zyntel super-admin only). ENG-157
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, jsonError } from "@/lib/auth/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

function mapConsoleTier(raw: string): string {
  const t = raw.toLowerCase();
  if (t === "professional") return "pro";
  if (t === "enterprise") return "enterprise";
  return "free";
}

export async function POST(req: NextRequest) {
  if (!supabaseConfigured) {
    return jsonError("Not configured", 503);
  }

  const ctx = await getAuthContext(req);
  if (!ctx.user) return jsonError("Unauthorized", 401);
  if (!ctx.isSuperAdmin) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const country =
    typeof body.country === "string" && body.country.trim() ? body.country.trim() : "Uganda";
  const tierRaw = typeof body.tier === "string" ? body.tier : "free";
  const parent_hospital_id =
    typeof body.parent_hospital_id === "string" && body.parent_hospital_id.trim()
      ? body.parent_hospital_id.trim()
      : undefined;

  if (!name || !city) {
    return jsonError("name and city are required", 400);
  }

  const tier = mapConsoleTier(tierRaw);

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const base = { name, city, country, tier };
    let insertPayload: Record<string, unknown> = { ...base };
    if (parent_hospital_id) {
      insertPayload = { ...base, parent_hospital_id };
    }

    let { data, error } = await db.from("hospitals").insert(insertPayload).select("id, name").single();

    if (error && parent_hospital_id) {
      const msg = (error.message || "").toLowerCase();
      const missingParentCol =
        msg.includes("parent_hospital_id") ||
        (msg.includes("column") && msg.includes("does not exist")) ||
        msg.includes("schema cache");
      if (missingParentCol) {
        console.warn(
          "[POST /api/console/facilities] parent_hospital_id unavailable; creating branch without group link:",
          error.message
        );
        const second = await db.from("hospitals").insert(base).select("id, name").single();
        data = second.data;
        error = second.error;
      }
    }

    if (error || !data?.id) {
      console.error("[POST /api/console/facilities]", error);
      return NextResponse.json(
        { error: error?.message ?? "Could not create hospital" },
        { status: 500 }
      );
    }

    return NextResponse.json({ facility_id: data.id, name: data.name });
  } catch (e) {
    console.error("[POST /api/console/facilities]", e);
    return NextResponse.json({ error: "Failed to create hospital" }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  if (!supabaseConfigured) {
    return NextResponse.json([]);
  }

  const ctx = await getAuthContext(_req);
  if (!ctx.user) return jsonError("Unauthorized", 401);
  if (!ctx.isSuperAdmin) return jsonError("Forbidden", 403);

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();
    const { data, error } = await db
      .from("hospitals")
      .select("id, name, city, country, tier, created_at")
      .order("name");

    if (error) {
      console.error("[GET /api/console/facilities]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("[GET /api/console/facilities]", e);
    return NextResponse.json({ error: "Failed to list facilities" }, { status: 500 });
  }
}
