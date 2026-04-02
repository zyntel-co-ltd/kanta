/**
 * Full health check — database + cache.
 * Use for operational dashboards. Returns 503 if any check fails.
 */

import { NextResponse } from "next/server";

export const runtime = "edge";

export async function HEAD() {
  return new Response(null, { status: 200 });
}

export async function GET() {
  const checks: Record<string, "ok" | "fail"> = {};

  // Database check
  try {
    const { createAdminClient } = await import("@/lib/supabase");
    const supabase = createAdminClient();
    await supabase.from("hospitals").select("id").limit(1);
    checks.database = "ok";
  } catch {
    checks.database = "fail";
  }

  // Cache check (optional — skip if Redis not configured)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { redis } = await import("@/lib/redis");
      await redis.ping();
      checks.cache = "ok";
    } catch {
      checks.cache = "fail";
    }
  } else {
    checks.cache = "ok"; // Not configured = skip
  }

  const healthy = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks, ts: Date.now() },
    { status: healthy ? 200 : 503 }
  );
}
