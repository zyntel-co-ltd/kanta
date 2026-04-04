/**
 * ENG-92: Facility API keys (admin panel) — list and create.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAdminPanel } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase";
import { generateApiKeyPlain, hashApiKey } from "@/lib/api/authenticate";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function GET(req: NextRequest) {
  const facilityId = req.nextUrl.searchParams.get("facility_id");
  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }
  if (!supabaseConfigured) {
    return NextResponse.json({ keys: [] });
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const denied = requireAdminPanel(ctx, facilityId);
  if (denied) return denied;

  const db = createAdminClient();
  const { data, error } = await db
    .from("api_keys")
    .select(
      "id, key_prefix, name, tier, rate_limit_per_minute, rate_limit_per_day, is_active, last_used_at, created_at, expires_at"
    )
    .eq("facility_id", facilityId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const facilityId = typeof body.facility_id === "string" ? body.facility_id : "";
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "API key";
  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }
  if (!supabaseConfigured) {
    return NextResponse.json({ key: "kanta_mock_dev_only", id: "mock" });
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const denied = requireAdminPanel(ctx, facilityId);
  if (denied) return denied;

  const plain = generateApiKeyPlain();
  const keyHash = hashApiKey(plain);
  const keyPrefix = plain.slice(0, 14);

  const db = createAdminClient();
  const { data, error } = await db
    .from("api_keys")
    .insert({
      facility_id: facilityId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name,
      tier: typeof body.tier === "string" ? body.tier : "free",
      rate_limit_per_minute: Number(body.rate_limit_per_minute) || 60,
      rate_limit_per_day: Number(body.rate_limit_per_day) || 1000,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    key: plain,
    message: "Copy this key now — it will not be shown again.",
  });
}
