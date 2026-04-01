/**
 * MySQL LIMS connector — placeholder (ENG-87).
 */

import { LIMSConnector } from "./base";
import { NotImplementedError } from "../errors";
import type { LIMSQueryConfig, LIMSRecord, TATEvent } from "../types";

export class MySQLLIMSConnector extends LIMSConnector {
  constructor(queryConfig: LIMSQueryConfig) {
    super(queryConfig);
  }

  async connect(): Promise<void> {
    throw new NotImplementedError("MySQL connector coming soon");
  }

  async disconnect(): Promise<void> {
    // no-op
  }

  async fetchTestRequests(since: Date): Promise<LIMSRecord[]> {
    void since;
    throw new NotImplementedError("MySQL connector coming soon");
  }

  async fetchTATEvents(since: Date): Promise<TATEvent[]> {
    void since;
    throw new NotImplementedError("MySQL connector coming soon");
  }

  async testConnection(): Promise<boolean> {
    throw new NotImplementedError("MySQL connector coming soon");
  }
}
