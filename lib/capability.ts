/**
 * Capability profile — engine of Adaptive Presence
 * Read facility_capability_profile.has_* to determine module presence
 */

export type CapabilityProfile = {
  facility_id: string;
  has_tat: boolean;
  has_revenue: boolean;
  has_refrigerator_monitoring: boolean;
  has_qc: boolean;
  has_equipment: boolean;
};

export type ModulePresence = "active" | "partial" | "locked";

export function getEquipmentPresence(
  profile: CapabilityProfile | null,
  equipmentCount: number
): ModulePresence {
  if (!profile?.has_equipment) return "locked";
  if (equipmentCount === 0) return "partial";
  return "active";
}

export function getTatPresence(profile: CapabilityProfile | null): ModulePresence {
  return profile?.has_tat ? "active" : "locked";
}

export function getRevenuePresence(
  profile: CapabilityProfile | null,
  role: string
): ModulePresence {
  if (!["admin", "manager"].includes(role)) return "locked";
  return profile?.has_revenue ? "active" : "locked";
}

export function getRefrigeratorPresence(
  profile: CapabilityProfile | null,
  unitCount: number
): ModulePresence {
  if (!profile?.has_refrigerator_monitoring) return "locked";
  if (unitCount === 0) return "partial";
  return "active";
}

export function getQcPresence(profile: CapabilityProfile | null): ModulePresence {
  return profile?.has_qc ? "active" : "locked";
}
