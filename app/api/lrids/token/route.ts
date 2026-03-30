/**
 * GET /api/lrids/token?facilityId=... — mint 24h HS256 JWT for standalone LRIDS (dashboard session required).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth, requireFacilityAccess, jsonError } from "@/lib/auth/server";
import { isLridsJwtConfigured, signLridsToken } from "@/lib/lrids/jwt";

export async function GET(req: NextRequest) {
  const facilityId = req.nextUrl.searchParams.get("facilityId")?.trim();
  if (!facilityId) {
    return jsonError("facilityId is required", 400);
  }

  if (!isLridsJwtConfigured()) {
    return jsonError("LRIDS display is not configured (LRIDS_TOKEN_SECRET)", 503);
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const accessErr = requireFacilityAccess(ctx, facilityId);
  if (accessErr) return accessErr;

  const token = await signLridsToken(facilityId);
  if (!token) {
    return jsonError("Failed to sign token", 500);
  }

  return NextResponse.json({ token, expiresInHours: 24 });
}
