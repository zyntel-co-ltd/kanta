export type TatQrPayload = {
  labNumber: string | null;
  facilityId: string | null;
  raw: string;
};

function normalizePart(value: string | null | undefined): string | null {
  if (!value) return null;
  const next = value.trim();
  return next ? next : null;
}

/**
 * Accepts legacy plain payloads (`LAB123:facility-id`) and JSON payloads.
 */
export function parseTatQrPayload(rawInput: string): TatQrPayload {
  const raw = rawInput.trim();
  if (!raw) {
    return { labNumber: null, facilityId: null, raw: rawInput };
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const labNumber = normalizePart(
      typeof parsed.lab_number === "string"
        ? parsed.lab_number
        : typeof parsed.labNumber === "string"
          ? parsed.labNumber
          : typeof parsed.barcode === "string"
            ? parsed.barcode
            : null
    );
    const facilityId = normalizePart(
      typeof parsed.facility_id === "string"
        ? parsed.facility_id
        : typeof parsed.facilityId === "string"
          ? parsed.facilityId
          : null
    );
    return { labNumber, facilityId, raw: rawInput };
  } catch {
    // Continue into legacy delimiter parsing below.
  }

  const delimiters = [":", "|", ","];
  for (const delimiter of delimiters) {
    if (!raw.includes(delimiter)) continue;
    const [first, second] = raw.split(delimiter).map((part) => part.trim());
    return {
      labNumber: normalizePart(first),
      facilityId: normalizePart(second),
      raw: rawInput,
    };
  }

  return { labNumber: raw, facilityId: null, raw: rawInput };
}
