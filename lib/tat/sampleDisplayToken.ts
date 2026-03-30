import { createHmac } from "node:crypto";

/**
 * Stable anonymized handle for a test_request row (no raw UUID in UI).
 * Uses server secret so tokens are not guessable across facilities.
 */
export function computeSampleDisplayToken(facilityId: string, rowId: string): string {
  const secret = (
    process.env.TAT_SAMPLE_TOKEN_SECRET?.trim() ||
    process.env.FACILITY_HASH_SALT?.trim() ||
    "kanta-dev-tat-sample-token"
  ).trim();
  return createHmac("sha256", secret)
    .update(`${facilityId}:${rowId}`)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
}
