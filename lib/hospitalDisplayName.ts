/**
 * Hospital label for UI: prefer name from facility settings (/api.me → hospitals.name),
 * then optional public env; avoid hardcoding a tenant name in app code.
 */
export function hospitalDisplayName(facilityName: string | null | undefined): string {
  const fromFacility = facilityName?.trim();
  if (fromFacility) return fromFacility;
  const fromEnv = process.env.NEXT_PUBLIC_HOSPITAL_NAME?.trim();
  if (fromEnv) return fromEnv;
  return "Hospital";
}
