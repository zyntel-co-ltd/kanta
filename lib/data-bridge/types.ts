/**
 * Data Bridge — generic LIMS connector types (ENG-87).
 */

/** Stored connector kinds; MSSQL stub may be added later. */
export type LIMSConnectorType = "postgresql" | "mysql" | "mssql";

/**
 * Column/table mapping for SQL LIMS sources (JSONB `query_config`).
 * Maps hospital-specific LIMS names to logical fields Kanta uses.
 */
export type LIMSQueryConfig = {
  /** Source table for test / lab request rows (e.g. LabGuru `lab_requests`). */
  testRequestTable: string;
  /**
   * Stable row identifier in the LIMS for deduplication (PK or composite key column).
   * If omitted, sync may synthesize from lab number + test + time (weaker).
   */
  idColumn?: string;
  sampleIdColumn?: string;
  labNumberColumn?: string;
  testNameColumn: string;
  sectionColumn: string;
  receivedAtColumn: string;
  /** Result / verification time — used for TAT end and status. */
  resultAtColumn?: string;
  /** Incremental sync watermark (defaults to receivedAtColumn if not set). */
  updatedAtColumn?: string;
  requestedAtColumn?: string;
  patientIdColumn?: string;
  priorityColumn?: string;
  statusColumn?: string;
  /** Optional separate table for TAT events; if unset, connector may reuse test request table. */
  tatEventsTable?: string;
};

/** One raw row from the LIMS (keys = column names as returned by the DB driver). */
export type LIMSRecord = Record<string, unknown>;

/** Normalized TAT-oriented event from any LIMS (before Kanta persistence). */
export type TATEvent = {
  limsExternalId: string;
  sampleId?: string | null;
  labNumber?: string | null;
  testName?: string | null;
  section?: string | null;
  receivedAt: Date | null;
  resultedAt: Date | null;
  raw?: LIMSRecord;
};

/**
 * Logical test request for sync into `test_requests`.
 * Dates as ISO strings for JSON serialization.
 */
export type TestRequest = {
  facility_id: string;
  patient_id: string | null;
  lab_number: string | null;
  test_name: string;
  section: string;
  priority: "stat" | "urgent" | "routine";
  requested_at: string;
  received_at: string | null;
  resulted_at: string | null;
  status: "pending" | "received" | "in_progress" | "resulted" | "cancelled";
  lims_connection_id: string;
  lims_external_id: string;
};

/** DB row shape for `lims_connections` (server-side). */
export type LIMSConnection = {
  id: string;
  facility_id: string;
  connector_type: LIMSConnectorType;
  /** Encrypted payload (see `crypto.ts`) or legacy plain object during migration. */
  connection_config: unknown;
  query_config: LIMSQueryConfig;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at?: string | null;
};

/** Result of a sync run (orchestrator + log row). */
export type SyncResult = {
  success: boolean;
  syncLogId: string;
  recordsFetched: number;
  recordsUpserted: number;
  error?: string;
};
