/**
 * LIMS sync orchestration — fetch, transform, upsert `test_requests`, log to `lims_sync_log` (ENG-87).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { mapLimsTestName } from "@/lib/bridge/name-matcher";
import { decryptConnectionConfig } from "./crypto";
import { PostgreSQLLIMSConnector } from "./connectors/postgresql";
import { MySQLLIMSConnector } from "./connectors/mysql";
import type { LIMSQueryConfig, SyncResult } from "./types";
import { transformLimsRowsToTestRequests } from "./transformers/tat";

async function bumpUnmatchedTestName(
  supabase: SupabaseClient,
  facilityId: string,
  sourceName: string
): Promise<void> {
  const name = sourceName.trim().slice(0, 500);
  if (!name) return;
  try {
    const { data: row } = await supabase
      .from("bridge_unmatched_test_names")
      .select("id, occurrence_count")
      .eq("facility_id", facilityId)
      .eq("source_name", name)
      .maybeSingle();
    const now = new Date().toISOString();
    if (row?.id) {
      await supabase
        .from("bridge_unmatched_test_names")
        .update({
          occurrence_count: Number(row.occurrence_count ?? 0) + 1,
          last_seen: now,
        })
        .eq("id", row.id);
    } else {
      await supabase.from("bridge_unmatched_test_names").insert({
        facility_id: facilityId,
        source_name: name,
        occurrence_count: 1,
        first_seen: now,
        last_seen: now,
      });
    }
  } catch {
    /* table may be missing on older DBs — non-fatal */
  }
}

function sanitizeErrorMessage(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return m
    .replace(/password[=:]\s*\S+/gi, "password=[redacted]")
    .replace(/pwd[=:]\s*\S+/gi, "pwd=[redacted]");
}

function buildConnector(
  connectorType: string,
  plain: Record<string, unknown>,
  queryConfig: LIMSQueryConfig
) {
  if (connectorType === "postgresql") {
    const host = String(plain.host ?? "");
    const port = Number(plain.port ?? 5432);
    const database = String(plain.database ?? "");
    const user = String(plain.user ?? "");
    const password = String(plain.password ?? "");
    const ssl = Boolean(plain.ssl);
    return new PostgreSQLLIMSConnector({
      host,
      port,
      database,
      user,
      password,
      ssl,
      queryConfig,
    });
  }
  if (connectorType === "mysql") {
    return new MySQLLIMSConnector(queryConfig);
  }
  throw new Error(`Unsupported LIMS connector_type: ${connectorType}`);
}

export type RunLIMSSyncParams = {
  supabase: SupabaseClient;
  limsConnectionId: string;
  /** Defaults to `process.env.LIMS_ENCRYPTION_KEY`. */
  encryptionKeyHex?: string;
};

/**
 * Loads a `lims_connections` row, connects to the LIMS, incrementally syncs from `last_synced_at`,
 * upserts into `test_requests`, writes `lims_sync_log`, and updates `last_synced_at` on success.
 */
export async function runLIMSSync(params: RunLIMSSyncParams): Promise<SyncResult> {
  const { supabase, limsConnectionId, encryptionKeyHex } = params;

  const { data: conn, error: loadErr } = await supabase
    .from("lims_connections")
    .select(
      "id, facility_id, connector_type, connection_config, query_config, is_active, last_synced_at"
    )
    .eq("id", limsConnectionId)
    .maybeSingle();

  if (loadErr) {
    return {
      success: false,
      syncLogId: "",
      recordsFetched: 0,
      recordsUpserted: 0,
      error: sanitizeErrorMessage(loadErr),
    };
  }
  if (!conn || !conn.is_active) {
    return {
      success: false,
      syncLogId: "",
      recordsFetched: 0,
      recordsUpserted: 0,
      error: "LIMS connection not found or inactive",
    };
  }

  const queryConfig = conn.query_config as LIMSQueryConfig;
  let plain: Record<string, unknown>;
  try {
    plain = decryptConnectionConfig(conn.connection_config, encryptionKeyHex);
  } catch (e) {
    return {
      success: false,
      syncLogId: "",
      recordsFetched: 0,
      recordsUpserted: 0,
      error: sanitizeErrorMessage(e),
    };
  }

  const startedAt = new Date().toISOString();
  const { data: logRow, error: logInsertErr } = await supabase
    .from("lims_sync_log")
    .insert({
      facility_id: conn.facility_id,
      lims_connection_id: conn.id,
      started_at: startedAt,
      records_fetched: 0,
      records_upserted: 0,
    })
    .select("id")
    .single();

  if (logInsertErr || !logRow?.id) {
    return {
      success: false,
      syncLogId: "",
      recordsFetched: 0,
      recordsUpserted: 0,
      error: sanitizeErrorMessage(logInsertErr ?? "log insert failed"),
    };
  }

  const syncLogId = logRow.id as string;
  const connector = buildConnector(
    conn.connector_type as string,
    plain,
    queryConfig
  );

  const since = conn.last_synced_at
    ? new Date(conn.last_synced_at as string)
    : new Date(0);
  const fallbackRequested = new Date().toISOString();

  try {
    await connector.connect();
    const rawRows = await connector.fetchTestRequests(since);
    await connector.disconnect();

    const payloads = transformLimsRowsToTestRequests(
      rawRows,
      conn.facility_id as string,
      conn.id as string,
      queryConfig,
      fallbackRequested
    );

    const { data: capRow } = await supabase
      .from("facility_capability_profile")
      .select("test_name_mappings, lab_number_retention_days")
      .eq("facility_id", conn.facility_id as string)
      .maybeSingle();

    const mappings = capRow?.test_name_mappings;
    const retentionDays =
      typeof capRow?.lab_number_retention_days === "number" && capRow.lab_number_retention_days > 0
        ? capRow.lab_number_retention_days
        : 90;

    const purgeAfterFromRequested = (requestedAt: string): string => {
      const base = new Date(requestedAt);
      if (Number.isNaN(base.getTime())) {
        const d = new Date();
        d.setDate(d.getDate() + retentionDays);
        return d.toISOString().slice(0, 10);
      }
      const d = new Date(base);
      d.setDate(d.getDate() + retentionDays);
      return d.toISOString().slice(0, 10);
    };

    for (const p of payloads) {
      const orig = p.test_name.trim() || "Unknown";
      const { kantaName, matched } = mapLimsTestName(orig, mappings);
      p.test_name = kantaName;
      if (matched === "none" && orig !== "Unknown") {
        await bumpUnmatchedTestName(supabase, conn.facility_id as string, orig);
      }
    }

    const upsertRows = payloads.map((p) => ({
      facility_id: p.facility_id,
      patient_id: p.patient_id,
      lab_number: p.lab_number,
      test_name: p.test_name,
      section: p.section,
      priority: p.priority,
      requested_at: p.requested_at,
      received_at: p.received_at,
      resulted_at: p.resulted_at,
      status: p.status,
      lims_connection_id: p.lims_connection_id,
      lims_external_id: p.lims_external_id,
      external_ref: p.external_ref ?? null,
      purge_after: purgeAfterFromRequested(p.requested_at),
      updated_at: fallbackRequested,
    }));

    let recordsUpserted = 0;
    if (upsertRows.length > 0) {
      // REGRESSIVE DESIGN: If lims_received_at is null, TAT cannot be calculated for this record.
      // Record is stored with received_at=null. Display logic in TAT page must handle null received_at gracefully.
      const { error: upErr } = await supabase.from("test_requests").upsert(
        upsertRows,
        {
          onConflict: "facility_id,lims_connection_id,lims_external_id",
        }
      );
      if (upErr) throw upErr;
      recordsUpserted = upsertRows.length;
    }

    const completedAt = new Date().toISOString();
    await supabase
      .from("lims_sync_log")
      .update({
        completed_at: completedAt,
        records_fetched: rawRows.length,
        records_upserted: recordsUpserted,
        error: null,
      })
      .eq("id", syncLogId);

    await supabase
      .from("lims_connections")
      .update({ last_synced_at: completedAt, updated_at: completedAt })
      .eq("id", limsConnectionId);

    return {
      success: true,
      syncLogId,
      recordsFetched: rawRows.length,
      recordsUpserted,
    };
  } catch (e) {
    const msg = sanitizeErrorMessage(e);
    try {
      await connector.disconnect();
    } catch {
      /* ignore */
    }
    await supabase
      .from("lims_sync_log")
      .update({
        completed_at: new Date().toISOString(),
        error: msg,
      })
      .eq("id", syncLogId);

    console.error("[runLIMSSync] failed", msg);

    return {
      success: false,
      syncLogId,
      recordsFetched: 0,
      recordsUpserted: 0,
      error: msg,
    };
  }
}
