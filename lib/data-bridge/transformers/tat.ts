/**
 * Map raw LIMS rows → Kanta `test_requests` shape using `query_config` (ENG-87).
 */

import type { LIMSQueryConfig, LIMSRecord, TATEvent, TestRequest } from "../types";

function pick(row: LIMSRecord, col: string | undefined): unknown {
  if (!col) return undefined;
  if (Object.prototype.hasOwnProperty.call(row, col)) return row[col];
  const lower = col.toLowerCase();
  for (const k of Object.keys(row)) {
    if (k.toLowerCase() === lower) return row[k];
  }
  return undefined;
}

function parseDate(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Map LIMS row → TAT event view (shared by PostgreSQL connector and sync).
 */
export function limsRowToTatEvent(
  row: LIMSRecord,
  q: LIMSQueryConfig
): TATEvent {
  const idCol = q.idColumn ?? q.labNumberColumn ?? "id";
  const idRaw = pick(row, idCol);
  const limsExternalId =
    idRaw != null && String(idRaw).length > 0 ? String(idRaw) : "unknown";

  const toDate = (col: string | undefined): Date | null => {
    if (!col) return null;
    const iso = parseDate(pick(row, col));
    return iso ? new Date(iso) : null;
  };

  return {
    limsExternalId,
    sampleId: q.sampleIdColumn ? (pick(row, q.sampleIdColumn) as string | null) : null,
    labNumber: q.labNumberColumn ? (pick(row, q.labNumberColumn) as string | null) : null,
    testName: q.testNameColumn ? (pick(row, q.testNameColumn) as string | null) : null,
    section: q.sectionColumn ? (pick(row, q.sectionColumn) as string | null) : null,
    receivedAt: toDate(q.receivedAtColumn),
    resultedAt: toDate(q.resultAtColumn),
    raw: row,
  };
}

function inferStatus(
  received: string | null,
  resulted: string | null,
  limsStatus: unknown
): TestRequest["status"] {
  const s = typeof limsStatus === "string" ? limsStatus.toLowerCase() : "";
  if (s.includes("cancel")) return "cancelled";
  if (resulted) return "resulted";
  if (received) return "in_progress";
  return "pending";
}

function inferPriority(limsPriority: unknown): TestRequest["priority"] {
  const p = typeof limsPriority === "string" ? limsPriority.toLowerCase() : "";
  if (p.includes("stat")) return "stat";
  if (p.includes("urgent")) return "urgent";
  return "routine";
}

/**
 * Build a stable external id for upsert when `idColumn` is not mapped.
 */
function externalIdForRow(
  row: LIMSRecord,
  q: LIMSQueryConfig
): string {
  if (q.idColumn) {
    const v = pick(row, q.idColumn);
    if (v != null && String(v).length > 0) return String(v);
  }
  const lab = q.labNumberColumn ? String(pick(row, q.labNumberColumn) ?? "") : "";
  const test = q.testNameColumn ? String(pick(row, q.testNameColumn) ?? "") : "";
  const rec = q.receivedAtColumn ? String(pick(row, q.receivedAtColumn) ?? "") : "";
  return `syn:${lab}:${test}:${rec}`.slice(0, 512);
}

/**
 * Transform raw LIMS rows into Kanta `test_requests` insert payloads.
 *
 * Field origins (typical LabGuru-style LIMS):
 * - `test_name` ← `testNameColumn` (e.g. `test_name`)
 * - `section` ← `sectionColumn` (e.g. `section_name` / `lab_section`)
 * - `lab_number` ← `labNumberColumn` or `sampleIdColumn` when no lab column
 * - `patient_id` ← `patientIdColumn` when present
 * - `requested_at` ← `requestedAtColumn`, else `received_at`, else sync time (caller passes `fallbackRequestedAt`)
 * - `received_at` ← `receivedAtColumn` (e.g. `received_time`)
 * - `resulted_at` ← `resultAtColumn` (e.g. `result_time`)
 * - `status` / `priority` ← optional LIMS columns or inferred from timestamps
 *
 * // REGRESSIVE DESIGN: If lims_received_at is null, TAT cannot be calculated for this record.
 * // Record is stored with received_at=null. Display logic in TAT page must handle null received_at gracefully.
 */
export function transformLimsRowsToTestRequests(
  rows: LIMSRecord[],
  facilityId: string,
  limsConnectionId: string,
  q: LIMSQueryConfig,
  fallbackRequestedAtIso: string
): TestRequest[] {
  const out: TestRequest[] = [];
  for (const row of rows) {
    // REGRESSIVE DESIGN: If lims_received_at is null, TAT cannot be calculated for this record.
    // Record is stored with received_at=null. Display logic in TAT page must handle null received_at gracefully.
    const receivedAt = q.receivedAtColumn ? parseDate(pick(row, q.receivedAtColumn)) : null;
    const resultedAt = q.resultAtColumn ? parseDate(pick(row, q.resultAtColumn)) : null;
    const requestedAt =
      (q.requestedAtColumn ? parseDate(pick(row, q.requestedAtColumn)) : null) ??
      receivedAt ??
      fallbackRequestedAtIso;

    const limsStatus = q.statusColumn ? pick(row, q.statusColumn) : undefined;
    const limsPri = q.priorityColumn ? pick(row, q.priorityColumn) : undefined;

    const testName = String(pick(row, q.testNameColumn) ?? "").trim() || "Unknown";
    const section = String(pick(row, q.sectionColumn) ?? "").trim() || "Unknown";

    const labNumber = q.labNumberColumn
      ? (pick(row, q.labNumberColumn) as string | null) ?? null
      : q.sampleIdColumn
        ? (pick(row, q.sampleIdColumn) as string | null) ?? null
        : null;

    const externalRef = q.externalRefColumn
      ? (() => {
          const v = pick(row, q.externalRefColumn);
          if (v == null) return null;
          const s = String(v).trim();
          return s.length ? s : null;
        })()
      : null;

    out.push({
      facility_id: facilityId,
      patient_id: q.patientIdColumn ? (pick(row, q.patientIdColumn) as string | null) ?? null : null,
      lab_number: labNumber,
      test_name: testName,
      section,
      priority: inferPriority(limsPri),
      requested_at: requestedAt,
      received_at: receivedAt,
      resulted_at: resultedAt,
      status: inferStatus(receivedAt, resultedAt, limsStatus),
      lims_connection_id: limsConnectionId,
      lims_external_id: externalIdForRow(row, q),
      external_ref: externalRef,
    });
  }
  return out;
}
