/**
 * Lightweight health check — no downstream calls.
 * Use for Vercel health checks and load balancer probes.
 */

import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json({ status: "ok", ts: Date.now() });
}
