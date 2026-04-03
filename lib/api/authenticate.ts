/**
 * ENG-92: Bearer API key auth + per-key rate limits (Upstash sliding window).
 */

import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { createAdminClient } from "@/lib/supabase";
import { redis } from "@/lib/redis";

export type PublicApiAuth = {
  facilityId: string;
  keyId: string;
  tier: string;
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
};

export function generateApiKeyPlain(): string {
  return `kanta_${randomBytes(16).toString("hex")}`;
}

export function hashApiKey(plain: string): string {
  return createHash("sha256").update(plain, "utf8").digest("hex");
}

function rateLimitHeaders(
  remainingMin: number,
  limitMin: number,
  remainingDay: number,
  limitDay: number,
  resetSec: number
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(limitMin),
    "X-RateLimit-Remaining": String(Math.max(0, remainingMin)),
    "X-RateLimit-Reset": String(resetSec),
    "X-RateLimit-Limit-Day": String(limitDay),
    "X-RateLimit-Remaining-Day": String(Math.max(0, remainingDay)),
  };
}

export async function authenticatePublicApi(
  req: NextRequest
): Promise<
  | { ok: true; auth: PublicApiAuth; headers: Record<string, string> }
  | { ok: false; response: NextResponse }
> {
  const raw = req.headers.get("authorization");
  const m = raw?.match(/^Bearer\s+(kanta_[a-f0-9]{32})$/i);
  if (!m) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Missing or invalid Authorization Bearer token" }, { status: 401 }),
    };
  }
  const plain = m[1].toLowerCase();
  const keyHash = hashApiKey(plain);

  const db = createAdminClient();
  const { data: row, error } = await db
    .from("api_keys")
    .select(
      "id, facility_id, tier, is_active, expires_at, rate_limit_per_minute, rate_limit_per_day"
    )
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !row || !row.is_active) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 }),
    };
  }

  if (row.expires_at && new Date(row.expires_at as string).getTime() < Date.now()) {
    return {
      ok: false,
      response: NextResponse.json({ error: "API key expired" }, { status: 401 }),
    };
  }

  const keyId = row.id as string;
  const facilityId = row.facility_id as string;
  const tier = String(row.tier ?? "free");
  const limitMin = Math.max(1, Number(row.rate_limit_per_minute ?? 60));
  const limitDay = Math.max(1, Number(row.rate_limit_per_day ?? 1000));

  const url = process.env.UPSTASH_REDIS_REST_URL ?? "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
  const redisConfigured = url.startsWith("https") && !!token;

  let headers = rateLimitHeaders(limitMin - 1, limitMin, limitDay - 1, limitDay, Math.ceil(Date.now() / 1000) + 60);

  if (redisConfigured) {
    try {
      const minuteRl = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limitMin, "60 s"),
        prefix: `api:rl:min:${keyId}`,
      });
      const dayRl = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limitDay, "86400 s"),
        prefix: `api:rl:day:${keyId}`,
      });
      const [minRes, dayRes] = await Promise.all([minuteRl.limit(keyId), dayRl.limit(keyId)]);
      if (!minRes.success) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: "Rate limit exceeded (per minute)" },
            {
              status: 429,
              headers: rateLimitHeaders(0, limitMin, dayRes.remaining, limitDay, minRes.reset),
            }
          ),
        };
      }
      if (!dayRes.success) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: "Rate limit exceeded (per day)" },
            {
              status: 429,
              headers: rateLimitHeaders(minRes.remaining, limitMin, 0, limitDay, dayRes.reset),
            }
          ),
        };
      }
      headers = rateLimitHeaders(
        minRes.remaining,
        limitMin,
        dayRes.remaining,
        limitDay,
        minRes.reset
      );
    } catch {
      /* Redis errors — allow request (degraded) */
    }
  }

  void db
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyId);

  return {
    ok: true,
    auth: {
      facilityId,
      keyId,
      tier,
      rateLimitPerMinute: limitMin,
      rateLimitPerDay: limitDay,
    },
    headers,
  };
}

export function facilityMismatchResponse(): NextResponse {
  return NextResponse.json(
    { error: "API key is not authorized for this facility" },
    { status: 403 }
  );
}
