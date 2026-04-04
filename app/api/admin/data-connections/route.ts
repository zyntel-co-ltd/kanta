import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getAuthContext, requireAdminPanel } from "@/lib/auth/server";
import {
  decryptConnectionConfig,
  encryptConnectionConfig,
} from "@/lib/data-bridge/crypto";
import type { LIMSQueryConfig } from "@/lib/data-bridge/types";

function parseQueryConfig(body: unknown): LIMSQueryConfig {
  const q = body as Record<string, unknown>;
  const testRequestTable = String(q.testRequestTable ?? "").trim();
  const testNameColumn = String(q.testNameColumn ?? "").trim();
  const sectionColumn = String(q.sectionColumn ?? "").trim();
  const receivedAtColumn = String(q.receivedAtColumn ?? "").trim();
  if (!testRequestTable || !testNameColumn || !sectionColumn || !receivedAtColumn) {
    throw new Error(
      "query_config requires testRequestTable, testNameColumn, sectionColumn, receivedAtColumn"
    );
  }
  return {
    testRequestTable,
    testNameColumn,
    sectionColumn,
    receivedAtColumn,
    sampleIdColumn: q.sampleIdColumn ? String(q.sampleIdColumn).trim() : undefined,
    resultAtColumn: q.resultAtColumn ? String(q.resultAtColumn).trim() : undefined,
    idColumn: q.idColumn ? String(q.idColumn).trim() : undefined,
    labNumberColumn: q.labNumberColumn ? String(q.labNumberColumn).trim() : undefined,
    updatedAtColumn: q.updatedAtColumn ? String(q.updatedAtColumn).trim() : undefined,
    externalRefColumn: q.externalRefColumn ? String(q.externalRefColumn).trim() : undefined,
  };
}

/** GET — load connection (secrets redacted) + last 10 sync logs for facility. */
export async function GET(req: NextRequest) {
  const facilityId = req.nextUrl.searchParams.get("facility_id");
  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const denied = requireAdminPanel(ctx, facilityId);
  if (denied) return denied;

  try {
    const db = createAdminClient();
    const { data: rows } = await db
      .from("lims_connections")
      .select(
        "id, facility_id, connector_type, connection_config, query_config, is_active, last_synced_at, created_at, updated_at"
      )
      .eq("facility_id", facilityId)
      .order("created_at", { ascending: false })
      .limit(1);

    const row = rows?.[0] ?? null;

    const { data: logs } = await db
      .from("lims_sync_log")
      .select(
        "id, started_at, completed_at, records_fetched, records_upserted, error, created_at"
      )
      .eq("facility_id", facilityId)
      .order("started_at", { ascending: false })
      .limit(10);

    let connection: Record<string, unknown> | null = null;

    if (row) {
      try {
        const plain = decryptConnectionConfig(row.connection_config);
        connection = {
          id: row.id,
          connector_type: row.connector_type,
          is_active: row.is_active,
          last_synced_at: row.last_synced_at,
          query_config: row.query_config as LIMSQueryConfig,
          host: String(plain.host ?? ""),
          port: Number(plain.port ?? 5432),
          database: String(plain.database ?? ""),
          user: String(plain.user ?? ""),
          ssl: Boolean(plain.ssl),
          passwordSaved: typeof plain.password === "string" && plain.password.length > 0,
        };
      } catch {
        connection = {
          id: row.id,
          connector_type: row.connector_type,
          is_active: row.is_active,
          last_synced_at: row.last_synced_at,
          query_config: row.query_config,
          host: "",
          port: 5432,
          database: "",
          user: "",
          ssl: false,
          passwordSaved: true,
          decryptError: true,
        };
      }
    }

    let lastError: string | null = null;
    for (const l of logs ?? []) {
      if (l.error) {
        lastError = String(l.error);
        break;
      }
    }

    const syncLogs = (logs ?? []).map((l) => {
      const started = l.started_at ? new Date(l.started_at as string).getTime() : 0;
      const completed = l.completed_at ? new Date(l.completed_at as string).getTime() : 0;
      const durationMs =
        started && completed && completed >= started ? completed - started : null;
      return {
        id: l.id,
        started_at: l.started_at,
        completed_at: l.completed_at,
        duration_ms: durationMs,
        records_fetched: l.records_fetched,
        records_upserted: l.records_upserted,
        error: l.error,
      };
    });

    return NextResponse.json({
      connection,
      lastError,
      syncLogs,
    });
  } catch (e) {
    console.error("[GET /api/admin/data-connections]", e);
    return NextResponse.json({ error: "Failed to load data connections" }, { status: 500 });
  }
}

/** POST — create or update LIMS connection (encrypts credentials). */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const facilityId = typeof body.facility_id === "string" ? body.facility_id : "";
  if (!facilityId) {
    return NextResponse.json({ error: "facility_id required" }, { status: 400 });
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const denied = requireAdminPanel(ctx, facilityId);
  if (denied) return denied;

  const connectorType = String(body.connector_type ?? "postgresql").toLowerCase();
  if (connectorType !== "postgresql") {
    return NextResponse.json({ error: "Only postgresql is supported" }, { status: 400 });
  }

  let queryConfig: LIMSQueryConfig;
  try {
    queryConfig = parseQueryConfig(body.query_config ?? body);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid query_config" },
      { status: 400 }
    );
  }

  const host = String(body.host ?? "").trim();
  const database = String(body.database ?? "").trim();
  const user = String(body.user ?? "").trim();
  const passwordInput = typeof body.password === "string" ? body.password : "";
  const port = Number(body.port ?? 5432);
  const ssl = Boolean(body.ssl);

  if (!host || !database || !user) {
    return NextResponse.json(
      { error: "host, database, and user are required" },
      { status: 400 }
    );
  }

  try {
    const db = createAdminClient();
    const connectionId =
      typeof body.id === "string" && body.id ? body.id : null;

    let passwordToEncrypt = passwordInput;

    if (connectionId) {
      const { data: existing } = await db
        .from("lims_connections")
        .select("id, connection_config")
        .eq("id", connectionId)
        .eq("facility_id", facilityId)
        .maybeSingle();
      if (!existing) {
        return NextResponse.json({ error: "Connection not found" }, { status: 404 });
      }
      if (!passwordInput) {
        const prev = decryptConnectionConfig(existing.connection_config);
        passwordToEncrypt = String(prev.password ?? "");
      }
    } else {
      if (!passwordInput) {
        return NextResponse.json(
          { error: "password is required for a new connection" },
          { status: 400 }
        );
      }
    }

    const plain = {
      host,
      port,
      database,
      user,
      password: passwordToEncrypt,
      ssl,
    };

    const connection_config = encryptConnectionConfig(plain);

    const payload = {
      facility_id: facilityId,
      connector_type: "postgresql",
      connection_config,
      query_config: queryConfig as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    };

    if (connectionId) {
      const { data, error } = await db
        .from("lims_connections")
        .update(payload)
        .eq("id", connectionId)
        .eq("facility_id", facilityId)
        .select("id")
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, id: data?.id });
    }

    const { data, error } = await db
      .from("lims_connections")
      .insert({
        ...payload,
        is_active: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, id: data?.id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    console.error("[POST /api/admin/data-connections]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** PATCH — enable/disable sync (`is_active`). */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const facilityId = typeof body.facility_id === "string" ? body.facility_id : "";
  const id = typeof body.id === "string" ? body.id : "";
  if (!facilityId || !id) {
    return NextResponse.json({ error: "facility_id and id required" }, { status: 400 });
  }

  const ctx = await getAuthContext(req, { facilityIdHint: facilityId });
  const denied = requireAdminPanel(ctx, facilityId);
  if (denied) return denied;

  if (typeof body.is_active !== "boolean") {
    return NextResponse.json({ error: "is_active boolean required" }, { status: 400 });
  }

  try {
    const db = createAdminClient();
    const { error } = await db
      .from("lims_connections")
      .update({
        is_active: body.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("facility_id", facilityId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/admin/data-connections]", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
