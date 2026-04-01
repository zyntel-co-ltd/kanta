/**
 * PostgreSQL LIMS connector (node-postgres).
 */

import { Pool, type PoolConfig } from "pg";
import { LIMSConnector } from "./base";
import { limsRowToTatEvent } from "../transformers/tat";
import type { LIMSQueryConfig, LIMSRecord, TATEvent } from "../types";

export type PostgreSQLLIMSOptions = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  queryConfig: LIMSQueryConfig;
};

/** Split "schema.table" or "table" into validated identifier parts. */
function parseTableIdent(qualified: string): string[] {
  const t = qualified.trim();
  if (!t) throw new Error("testRequestTable is required");
  const parts = t.split(".").map((p) => p.trim()).filter(Boolean);
  if (parts.length > 2) throw new Error("Table name may have at most schema.table");
  for (const p of parts) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(p)) {
      throw new Error(`Invalid SQL identifier: ${p}`);
    }
  }
  return parts;
}

function quoteTable(parts: string[]): string {
  return parts.map((p) => `"${p.replace(/"/g, '""')}"`).join(".");
}

function assertCol(name: string | undefined, label: string): string {
  if (!name || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid or missing column mapping: ${label}`);
  }
  return name;
}

function col(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export class PostgreSQLLIMSConnector extends LIMSConnector {
  private pool: Pool | null = null;
  private readonly pg: PostgreSQLLIMSOptions;

  constructor(opts: PostgreSQLLIMSOptions) {
    super(opts.queryConfig);
    this.pg = opts;
  }

  async connect(): Promise<void> {
    const cfg: PoolConfig = {
      host: this.pg.host,
      port: this.pg.port,
      database: this.pg.database,
      user: this.pg.user,
      password: this.pg.password,
      max: 4,
      ssl: this.pg.ssl ? { rejectUnauthorized: false } : undefined,
    };
    this.pool = new Pool(cfg);
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.pool) await this.connect();
    const p = this.pool!;
    const r = await p.query("SELECT 1 AS ok");
    return r.rows?.[0]?.ok === 1;
  }

  private watermarkColumn(): string {
    const q = this.queryConfig;
    return assertCol(
      q.updatedAtColumn || q.receivedAtColumn,
      "updatedAtColumn or receivedAtColumn"
    );
  }

  async fetchTestRequests(since: Date): Promise<LIMSRecord[]> {
    if (!this.pool) await this.connect();
    const p = this.pool!;
    const q = this.queryConfig;
    const table = quoteTable(parseTableIdent(q.testRequestTable));
    const wm = col(this.watermarkColumn());
    const sql = `SELECT * FROM ${table} WHERE ${wm} IS NOT NULL AND ${wm} >= $1 ORDER BY ${wm} ASC`;
    const res = await p.query(sql, [since]);
    return res.rows as LIMSRecord[];
  }

  async fetchTATEvents(since: Date): Promise<TATEvent[]> {
    const q = this.queryConfig;
    const eventsTable = (q.tatEventsTable ?? "").trim();
    const testTable = q.testRequestTable.trim();
    if (!eventsTable || eventsTable === testTable) {
      const raw = await this.fetchTestRequests(since);
      return raw.map((row) => limsRowToTatEvent(row, this.queryConfig));
    }
    const raw = await this.fetchRawForTable(eventsTable, since);
    return raw.map((row) => limsRowToTatEvent(row, this.queryConfig));
  }

  private async fetchRawForTable(
    qualifiedTable: string,
    since: Date
  ): Promise<LIMSRecord[]> {
    if (!this.pool) await this.connect();
    const p = this.pool!;
    const table = quoteTable(parseTableIdent(qualifiedTable));
    const wm = col(this.watermarkColumn());
    const sql = `SELECT * FROM ${table} WHERE ${wm} IS NOT NULL AND ${wm} >= $1 ORDER BY ${wm} ASC`;
    const res = await p.query(sql, [since]);
    return res.rows as LIMSRecord[];
  }

}
