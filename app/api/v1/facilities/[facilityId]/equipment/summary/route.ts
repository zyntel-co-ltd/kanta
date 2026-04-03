/**
 * ENG-92: Equipment availability summary (Bearer API key).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { redis } from "@/lib/redis";
import {
  authenticatePublicApi,
  facilityMismatchResponse,
} from "@/lib/api/authenticate";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ facilityId: string }> }
) {
  const { facilityId } = await params;
  const auth = await authenticatePublicApi(req);
  if (!auth.ok) return auth.response;
  if (auth.auth.facilityId !== facilityId) {
    return facilityMismatchResponse();
  }

  const cacheKey = `api:cache:equipment-summary:${facilityId}`;
  try {
    const raw = await redis.get(cacheKey);
    if (typeof raw === "string") {
      const body = JSON.parse(raw) as Record<string, unknown>;
      const h = new Headers(auth.headers);
      h.set("X-Cache", "HIT");
      return NextResponse.json(body, { headers: h });
    }
  } catch {
    /* no cache */
  }

  const db = createAdminClient();
  const { data: hospital } = await db
    .from("hospitals")
    .select("name")
    .eq("id", facilityId)
    .maybeSingle();

  const { data: rows } = await db
    .from("equipment")
    .select("status, next_maintenance_at")
    .eq("facility_id", facilityId)
    .neq("status", "retired");

  const list = rows ?? [];
  const equipmentCount = list.length;
  const operational = list.filter((r) => r.status === "operational").length;
  const maintenance = list.filter((r) => r.status === "maintenance").length;
  const offline = list.filter((r) => r.status === "offline").length;
  const now = Date.now();
  const maintenanceDueCount = list.filter((r) => {
    const t = r.next_maintenance_at ? new Date(r.next_maintenance_at as string).getTime() : null;
    return t != null && t <= now;
  }).length;

  const availableCount = operational;
  const availabilityRate =
    equipmentCount > 0 ? Math.round((availableCount / equipmentCount) * 1000) / 1000 : 0;

  const generatedAt = new Date().toISOString();
  const body = {
    facilityId,
    facilityName: (hospital as { name?: string } | null)?.name ?? null,
    equipmentCount,
    availableCount,
    availabilityRate,
    maintenanceDueCount,
    offlineCount: offline,
    maintenanceCount: maintenance,
    lastUpdated: generatedAt,
    generatedAt,
  };

  try {
    await redis.set(cacheKey, JSON.stringify(body), { ex: 300 });
  } catch {
    /* ignore */
  }

  const h = new Headers(auth.headers);
  h.set("X-Cache", "MISS");
  return NextResponse.json(body, { headers: h });
}
