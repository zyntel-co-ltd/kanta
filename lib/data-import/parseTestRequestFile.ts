/**
 * ENG-100: Parse CSV / JSON uploads for historical test_requests import.
 */

import { mapLimsTestName } from "@/lib/bridge/name-matcher";

export type ParsedImportRow = Record<string, string>;

function stripBom(s: string): string {
  if (s.charCodeAt(0) === 0xfeff) return s.slice(1);
  return s;
}

function parseCsv(text: string): ParsedImportRow[] {
  const lines = stripBom(text).split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: ParsedImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const row: ParsedImportRow = {};
    header.forEach((h, j) => {
      row[h] = cols[j] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function parseJson(text: string): ParsedImportRow[] {
  const data = JSON.parse(text) as unknown;
  if (!Array.isArray(data)) return [];
  return data.filter((x) => x && typeof x === "object") as ParsedImportRow[];
}

export function parseTestRequestImportFile(
  buf: Buffer,
  ext: ".csv" | ".json"
): ParsedImportRow[] {
  const text = buf.toString("utf8");
  if (ext === ".json") return parseJson(text);
  return parseCsv(text);
}

export type NormalizedImportRow = {
  facility_id: string;
  lab_number: string | null;
  test_name: string;
  section: string;
  priority: "stat" | "urgent" | "routine";
  requested_at: string;
  received_at: string | null;
  resulted_at: string | null;
  status: "pending" | "received" | "in_progress" | "resulted" | "cancelled";
  patient_id: string | null;
  price_ugx: number | null;
  external_ref: string | null;
  purge_after: string;
};

function pick(row: ParsedImportRow, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

export function normalizeImportRow(
  row: ParsedImportRow,
  facilityId: string,
  mappings: unknown,
  retentionDays: number
): { row: NormalizedImportRow | null; error?: string } {
  const testRaw = pick(row, "test_name", "testName", "Test Name");
  const section = pick(row, "section", "Section", "section_name");
  const lab = pick(row, "lab_number", "labNumber", "Lab Number", "sample_no");
  if (!testRaw || !section) {
    return { row: null, error: "Missing test_name or section" };
  }
  const { kantaName } = mapLimsTestName(testRaw, mappings);

  const requested =
    pick(row, "requested_at", "requestedAt", "created_at", "createdAt") ||
    new Date().toISOString();
  const received = pick(row, "received_at", "receivedAt") || null;
  const resulted = pick(row, "resulted_at", "resultedAt", "result_at") || null;

  const st = pick(row, "status", "Status").toLowerCase();
  let status: NormalizedImportRow["status"] = "pending";
  if (st.includes("cancel")) status = "cancelled";
  else if (st.includes("result")) status = "resulted";
  else if (st.includes("progress") || st.includes("received")) status = "in_progress";
  else if (st.includes("received")) status = "received";

  const pr = pick(row, "priority", "Priority").toLowerCase();
  let priority: NormalizedImportRow["priority"] = "routine";
  if (pr.includes("stat")) priority = "stat";
  else if (pr.includes("urgent")) priority = "urgent";

  const patient = pick(row, "patient_id", "patientId") || null;
  const extRef = pick(row, "external_ref", "externalRef", "invoice") || null;
  const priceRaw = pick(row, "price_ugx", "priceUgX", "price");
  const price_ugx = priceRaw ? Number(priceRaw) : null;

  const base = new Date(requested);
  if (Number.isNaN(base.getTime())) {
    return { row: null, error: "Invalid requested_at / created_at" };
  }
  const purge = new Date(base);
  purge.setDate(purge.getDate() + Math.max(1, retentionDays));

  return {
    row: {
      facility_id: facilityId,
      lab_number: lab || null,
      test_name: kantaName,
      section,
      priority,
      requested_at: base.toISOString(),
      received_at: received ? new Date(received).toISOString() : null,
      resulted_at: resulted ? new Date(resulted).toISOString() : null,
      status,
      patient_id: patient,
      price_ugx: price_ugx != null && !Number.isNaN(price_ugx) ? price_ugx : null,
      external_ref: extRef,
      purge_after: purge.toISOString().slice(0, 10),
    },
  };
}
