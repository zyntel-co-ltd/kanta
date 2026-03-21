/**
 * Capability profile — cached in Redis, drives Adaptive Presence.
 * Every module tile reads from this.
 */

import { redis } from "./redis";
import { createAdminClient } from "./supabase";

export type CapabilityProfile = {
  facility_id: string;
  has_tat: boolean;
  has_revenue: boolean;
  has_refrigerator_monitoring: boolean;
  has_qc: boolean;
  has_equipment: boolean;
};

const TTL = 60 * 15; // 15 minutes

export async function getCapabilityProfile(
  facilityId: string
): Promise<CapabilityProfile | null> {
  const key = `cap:${facilityId}`;
  const cached = await redis.get(key);
  if (cached) return cached as CapabilityProfile;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("facility_capability_profile")
      .select("*")
      .eq("facility_id", facilityId)
      .single();

    if (data) {
      await redis.set(key, data, { ex: TTL });
      return data as CapabilityProfile;
    }
  } catch {
    // Table may not exist yet
  }
  return null;
}

export async function invalidateCapabilityProfile(
  facilityId: string
): Promise<void> {
  await redis.del(`cap:${facilityId}`);
}
