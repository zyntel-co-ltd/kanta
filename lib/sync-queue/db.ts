"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  type PendingSync,
  SYNC_QUEUE_DB,
  SYNC_QUEUE_DB_VERSION,
  SYNC_QUEUE_STORE,
} from "./types";

interface KantaSyncSchema extends DBSchema {
  pending_syncs: {
    key: string;
    value: PendingSync;
  };
}

let dbPromise: Promise<IDBPDatabase<KantaSyncSchema>> | null = null;

export function getSyncQueueDb(): Promise<IDBPDatabase<KantaSyncSchema> | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = openDB<KantaSyncSchema>(SYNC_QUEUE_DB, SYNC_QUEUE_DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
          db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function addPendingSync(row: PendingSync): Promise<void> {
  const db = await getSyncQueueDb();
  if (!db) return;
  await db.put(SYNC_QUEUE_STORE, row);
}

export async function removePendingSync(id: string): Promise<void> {
  const db = await getSyncQueueDb();
  if (!db) return;
  await db.delete(SYNC_QUEUE_STORE, id);
}

export async function updatePendingSync(row: PendingSync): Promise<void> {
  const db = await getSyncQueueDb();
  if (!db) return;
  await db.put(SYNC_QUEUE_STORE, row);
}

export async function getAllSyncRows(): Promise<PendingSync[]> {
  const db = await getSyncQueueDb();
  if (!db) return [];
  return db.getAll(SYNC_QUEUE_STORE);
}

export async function listPendingOrdered(): Promise<PendingSync[]> {
  const rows = await getAllSyncRows();
  return rows
    .filter((r) => r.status === "pending")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function listFailedSyncs(): Promise<PendingSync[]> {
  const rows = await getAllSyncRows();
  return rows.filter((r) => r.status === "failed");
}

export async function countPendingSyncs(): Promise<number> {
  const rows = await getAllSyncRows();
  return rows.filter((r) => r.status === "pending").length;
}

export async function countFailedSyncs(): Promise<number> {
  const rows = await getAllSyncRows();
  return rows.filter((r) => r.status === "failed").length;
}

export async function resetFailedToPending(): Promise<void> {
  const db = await getSyncQueueDb();
  if (!db) return;
  const rows = await db.getAll(SYNC_QUEUE_STORE);
  for (const r of rows) {
    if (r.status === "failed") {
      await db.put(SYNC_QUEUE_STORE, { ...r, status: "pending", retry_count: 0 });
    }
  }
}
