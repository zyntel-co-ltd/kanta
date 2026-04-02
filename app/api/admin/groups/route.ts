/**
 * GET /api/admin/groups — List hospital groups + all hospitals (super-admin only). ENG-91
 * POST /api/admin/groups — Create a hospital group (super-admin only).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, jsonError } from "@/lib/auth/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return s || "group";
}

export async function GET(req: NextRequest) {
  if (!supabaseConfigured) {
    return NextResponse.json({ groups: [], hospitals: [] });
  }

  const ctx = await getAuthContext(req);
  if (!ctx.user) return jsonError("Unauthorized", 401);
  if (!ctx.isSuperAdmin) return jsonError("Forbidden", 403);

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();
    const [{ data: groups, error: gErr }, { data: hospitals, error: hErr }] = await Promise.all([
      db.from("hospital_groups").select("id, name, slug, created_at").order("name"),
      db
        .from("hospitals")
        .select("id, name, city, country, tier, group_id, branch_name")
        .order("name"),
    ]);
    if (gErr) throw gErr;
    if (hErr) throw hErr;
    return NextResponse.json({
      groups: groups ?? [],
      hospitals: hospitals ?? [],
    });
  } catch (e) {
    console.error("[GET /api/admin/groups]", e);
    return NextResponse.json({ error: "Failed to load groups" }, { status: 500 });
  }
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
  if (!name) {
    return jsonError("name is required", 400);
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const slug =
      typeof body.slug === "string" && body.slug.trim()
        ? body.slug
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 80)
        : slugify(name);

    for (let i = 0; i < 10; i++) {
      const attempt = i === 0 ? slug : `${slug}-${Math.random().toString(36).slice(2, 7)}`;
      const { data, error } = await db
        .from("hospital_groups")
        .insert({ name, slug: attempt })
        .select("id, name, slug, created_at")
        .single();
      if (!error && data) {
        return NextResponse.json(data);
      }
      if (error && !String(error.message).toLowerCase().includes("duplicate")) {
        console.error("[POST /api/admin/groups]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    return jsonError("Could not allocate unique slug", 500);
  } catch (e) {
    console.error("[POST /api/admin/groups]", e);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
