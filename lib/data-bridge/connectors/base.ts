/**
 * Abstract LIMS connector — implement per database engine (ENG-87).
 */

import type { LIMSQueryConfig, LIMSRecord, TATEvent } from "../types";

export abstract class LIMSConnector {
  protected readonly queryConfig: LIMSQueryConfig;

  constructor(queryConfig: LIMSQueryConfig) {
    this.queryConfig = queryConfig;
  }

  abstract connect(): Promise<void>;

  abstract disconnect(): Promise<void>;

  /** Returns raw rows from the LIMS since the given time (incremental sync). */
  abstract fetchTestRequests(since: Date): Promise<LIMSRecord[]>;

  /** TAT-related events (may share the same source table as test requests). */
  abstract fetchTATEvents(since: Date): Promise<TATEvent[]>;

  /** Lightweight health check (no secrets logged). */
  abstract testConnection(): Promise<boolean>;
}
