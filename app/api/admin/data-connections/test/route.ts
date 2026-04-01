import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getAuthContext, requireAdminPanel } from "@/lib/auth/server";
import { decryptConnectionConfig } from "@/lib/data-bridge/crypto";
import { PostgreSQLLIMSConnector } from "@/lib/data-bridge/connectors/postgresql";
import type { LIMSQueryConfig } from "@/lib/data-bridge/types";

const TEST_TIMEOUT_MS = 10_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Connection test timed out after ${ms / 1000}s`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

function sanitizeTestError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return m
    .replace(/password=\S+/gi, "password=[redacted]")
    .replace(/:\\S+@/g, "://[redacted]@");
}

/**
 * POST — test LIMS connection (does not persist; never returns or logs password).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const facilityId = typeof body.facility_id === "string" ? body.facility_id : "";
  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const denied = requireAdminPanel(ctx, facilityId);
  if (denied) return denied;

  let host = String(body.host ?? "").trim();
  let database = String(body.database ?? "").trim();
  let user = String(body.user ?? "").trim();
  let password = typeof body.password === "string" ? body.password : "";
  let port = Number(body.port ?? 5432);
  let ssl = Boolean(body.ssl);

  let storedQuery: Record<string, unknown> = {};
  const useSavedId =
    typeof body.connection_id === "string" && Boolean(body.connection_id) && !password;
  if (useSavedId) {
    const db = createAdminClient();
    const { data: row, error } = await db
      .from("lims_connections")
      .select("connection_config, query_config")
      .eq("id", body.connection_id)
      .eq("facility_id", facilityId)
      .maybeSingle();
    if (error || !row) {
      return NextResponse.json({ error: "Saved connection not found" }, { status: 404 });
    }
    storedQuery =
      row.query_config && typeof row.query_config === "object"
        ? (row.query_config as Record<string, unknown>)
        : {};
    try {
      const plain = decryptConnectionConfig(row.connection_config);
      host = String(plain.host ?? host);
      database = String(plain.database ?? database);
      user = String(plain.user ?? user);
      password = String(plain.password ?? "");
      port = Number(plain.port ?? port);
      ssl = Boolean(plain.ssl);
    } catch {
      return NextResponse.json({ error: "Could not read saved credentials" }, { status: 500 });
    }
  }

  const fromClient =
    body.query_config && typeof body.query_config === "object"
      ? (body.query_config as Record<string, unknown>)
      : {};
  const qc: Record<string, unknown> = { ...storedQuery, ...fromClient };
  const rawBody = body as Record<string, unknown>;
  for (const key of [
    "testRequestTable",
    "testNameColumn",
    "sectionColumn",
    "receivedAtColumn",
    "sampleIdColumn",
    "resultAtColumn",
    "idColumn",
    "labNumberColumn",
    "updatedAtColumn",
  ] as const) {
    const v = rawBody[key];
    if (typeof v === "string" && v.trim()) qc[key] = v.trim();
  }

  const queryConfig = {
    testRequestTable: String(qc.testRequestTable ?? "").trim(),
    testNameColumn: String(qc.testNameColumn ?? "").trim(),
    sectionColumn: String(qc.sectionColumn ?? "").trim(),
    receivedAtColumn: String(qc.receivedAtColumn ?? "").trim(),
    sampleIdColumn: qc.sampleIdColumn ? String(qc.sampleIdColumn).trim() : undefined,
    resultAtColumn: qc.resultAtColumn ? String(qc.resultAtColumn).trim() : undefined,
    idColumn: qc.idColumn ? String(qc.idColumn).trim() : undefined,
    labNumberColumn: qc.labNumberColumn ? String(qc.labNumberColumn).trim() : undefined,
    updatedAtColumn: qc.updatedAtColumn ? String(qc.updatedAtColumn).trim() : undefined,
  } satisfies LIMSQueryConfig;

  if (
    !queryConfig.testRequestTable ||
    !queryConfig.testNameColumn ||
    !queryConfig.sectionColumn ||
    !queryConfig.receivedAtColumn
  ) {
    return NextResponse.json(
      { error: "query_config: testRequestTable, testNameColumn, sectionColumn, receivedAtColumn required" },
      { status: 400 }
    );
  }

  if (!host || !database || !user || !password) {
    return NextResponse.json(
      { error: "host, database, user, and password are required (or save a connection and test with connection_id only)" },
      { status: 400 }
    );
  }

  try {
    const result = await withTimeout(
      (async () => {
        const connector = new PostgreSQLLIMSConnector({
          host,
          port,
          database,
          user,
          password,
          ssl,
          queryConfig,
        });
        await connector.connect();
        const ok = await connector.testConnection();
        if (!ok) {
          await connector.disconnect();
          throw new Error("Database health check failed");
        }
        const rowCount = await connector.countRowsInTestRequestTable();
        await connector.disconnect();
        return { ok: true as const, rowCount };
      })(),
      TEST_TIMEOUT_MS
    );

    return NextResponse.json({
      success: true,
      rowCount: result.rowCount,
    });
  } catch (e) {
    const message = sanitizeTestError(e);
    console.error("[POST /api/admin/data-connections/test] failed");
    return NextResponse.json({ success: false, error: message }, { status: 200 });
  }
}
