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

/**
 * ENG-91: When the facility belongs to a hospital group, show `{name} — {branch}` in TopBar/Sidebar.
 * If `groupId` is set but `branchName` is empty, fall back to `hospitalDisplayName` only.
 */
export function facilityBrandingLine(
  hospitalName: string | null | undefined,
  groupId: string | null | undefined,
  branchName: string | null | undefined
): string {
  const base = hospitalDisplayName(hospitalName);
  const branch = branchName?.trim();
  if (groupId && branch) {
    return `${base} — ${branch}`;
  }
  return base;
}
