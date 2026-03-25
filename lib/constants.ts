/**
 * Default facility for Lab Metrics, QC, dashboard home, API fallbacks, and auth context.
 * Zyntel Hospital — `hospitals.id` in Supabase. Override per deployment with
 * `NEXT_PUBLIC_DEFAULT_FACILITY_ID` if your Zyntel row uses a different UUID.
 */
const ZYNTEL_HOSPITAL_FACILITY_ID = "6eafdd6c-cc3b-47cf-8bf6-44d7254be4b5";

function resolveDefaultFacilityId(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_DEFAULT_FACILITY_ID?.trim()
      : undefined;
  if (
    fromEnv &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fromEnv)
  ) {
    return fromEnv;
  }
  return ZYNTEL_HOSPITAL_FACILITY_ID;
}

export const DEFAULT_FACILITY_ID = resolveDefaultFacilityId();
export const DEFAULT_HOSPITAL_ID = DEFAULT_FACILITY_ID;
