/**
 * POST /api/telemetry/temperature — fridge sensor ingest
 * Auth: x-api-key (facility API key from facility_settings.telemetry_api_key)
 * Idempotency: x-idempotency-key (UUID, 24h TTL)
 */

import { NextRequest, NextResponse } from "next/server";

const supabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref");

export async function POST(req: NextRequest) {
  if (!supabaseConfigured) {
    return NextResponse.json({ error: "Not configured" }, { status: 501 });
  }

  const apiKey = req.headers.get("x-api-key");
  const idempotencyKey = req.headers.get("x-idempotency-key");

  if (!apiKey) {
    return NextResponse.json({ error: "x-api-key required" }, { status: 401 });
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const db = createAdminClient();

    const { data: settings } = await db
      .from("facility_settings")
      .select("facility_id")
      .eq("telemetry_api_key", apiKey)
      .single();

    if (!settings) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const facilityId = settings.facility_id;

    if (idempotencyKey) {
      const { redis } = await import("@/lib/redis");
      const exists = await redis.get(`idem:${idempotencyKey}`);
      if (exists) {
        return NextResponse.json({ status: "duplicate" }, { status: 200 });
      }
      await redis.set(`idem:${idempotencyKey}`, 1, { ex: 60 * 60 * 24 });
    }

    const body = await req.json();
    const { unit_id, temp_celsius } = body;

    if (!unit_id || temp_celsius == null) {
      return NextResponse.json(
        { error: "unit_id and temp_celsius required" },
        { status: 400 }
      );
    }

    const temp = Number(temp_celsius);

    const { data: unit } = await db
      .from("refrigerator_units")
      .select("id, min_temp_celsius, max_temp_celsius")
      .eq("id", unit_id)
      .eq("facility_id", facilityId)
      .single();

    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    const minT = Number(unit.min_temp_celsius);
    const maxT = Number(unit.max_temp_celsius);
    const breach = temp < minT ? "too_cold" : temp > maxT ? "too_hot" : null;

    const { data: reading, error: readErr } = await db
      .from("temp_readings")
      .insert({
        unit_id,
        facility_id: facilityId,
        temp_celsius: temp,
      })
      .select()
      .single();

    if (readErr) throw readErr;

    if (breach) {
      const deviation = breach === "too_cold" ? minT - temp : temp - maxT;
      await db.from("temp_breaches").insert({
        unit_id,
        facility_id: facilityId,
        breach_type: breach,
        max_deviation: deviation,
      });
    }

    return NextResponse.json({
      status: "ok",
      reading_id: reading?.id,
      breach: breach ?? null,
    });
  } catch (err) {
    console.error("[POST /api/telemetry/temperature]", err);
    return NextResponse.json(
      { error: "Failed to record temperature" },
      { status: 500 }
    );
  }
}
