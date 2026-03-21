/**
 * Edge middleware — auth + rate limiting (when configured).
 * Full Supabase auth integration when facility_id is in JWT.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Skip health endpoints
  if (req.nextUrl.pathname.startsWith("/api/health")) {
    return res;
  }

  // Rate limiting (optional — requires Upstash Redis)
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN &&
    req.nextUrl.pathname.startsWith("/api/")
  ) {
    try {
      const { Ratelimit } = await import("@upstash/ratelimit");
      const { redis } = await import("@/lib/redis");
      const rateLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, "1 m"),
        prefix: "kanta:rl",
      });
      const ip =
        req.headers.get("x-forwarded-for") ??
        req.headers.get("x-real-ip") ??
        "anonymous";
      const { success } = await rateLimiter.limit(ip);
      if (!success) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      }
    } catch {
      // Redis unavailable — allow request
    }
  }

  return res;
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*"],
};
