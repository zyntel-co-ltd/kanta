/**
 * ENG-63: IndexedDB offline write queue schema.
 */

export type PendingSyncMethod = "POST" | "PATCH" | "DELETE" | "PUT";

export interface PendingSync {
  id: string;
  endpoint: string;
  method: PendingSyncMethod;
  body: unknown;
  headers?: Record<string, string>;
  created_at: string;
  retry_count: number;
  status: "pending" | "failed";
}

export const SYNC_QUEUE_DB = "kanta-sync-queue";
export const SYNC_QUEUE_STORE = "pending_syncs";
export const SYNC_QUEUE_DB_VERSION = 1;

export const SYNC_QUEUE_CHANGED = "kanta-sync-queue-changed";
export const SYNC_QUEUED_TOAST = "kanta-offline-queued-toast";
