/**
 * Edge middleware — auth + rate limiting (when configured).
 * Protects /dashboard, allows /login, /forgot-password, /auth/*, /password-reset.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(req: NextRequest) {
  const { response: res, user } = await updateSession(req);

  // Skip health endpoints
  if (req.nextUrl.pathname.startsWith("/api/health")) {
    return res;
  }

  // Protect dashboard and root — redirect to login if no session
  const isProtected =
    req.nextUrl.pathname.startsWith("/dashboard") || req.nextUrl.pathname === "/";
  if (isProtected && !user) {
    const loginUrl = new URL("/login", req.url);
    if (req.nextUrl.pathname !== "/") {
      loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
    }
    return NextResponse.redirect(loginUrl);
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
  matcher: [
    "/",
    "/api/:path*",
    "/dashboard/:path*",
    "/login",
    "/forgot-password",
    "/password-reset",
    "/auth/:path*",
  ],
};
