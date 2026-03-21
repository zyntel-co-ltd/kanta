/**
 * Test Redis connection — GET to verify set/get works.
 * Remove or protect in production.
 */

import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET() {
  try {
    await redis.set("foo", "bar");
    const value = await redis.get("foo");
    return NextResponse.json({ ok: true, value });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Redis error" },
      { status: 500 }
    );
  }
}
