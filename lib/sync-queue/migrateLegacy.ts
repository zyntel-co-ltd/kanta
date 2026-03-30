"use client";

import { getPendingScans, removeQueuedScan } from "@/lib/offline-queue";
import { addPendingSync } from "./db";
import { SYNC_QUEUE_CHANGED } from "./types";

/** Moves legacy `kanta-offline-queue` scans into `pending_syncs` (FIFO by timestamp). */
export async function migrateLegacyScansToNewQueue(): Promise<number> {
  if (typeof window === "undefined") return 0;
  const pending = await getPendingScans();
  if (pending.length === 0) return 0;

  let migrated = 0;
  for (const scan of pending) {
    await addPendingSync({
      id: crypto.randomUUID(),
      endpoint: "/api/v1/scans",
      method: "POST",
      body: {
        equipment_id: scan.equipment_id,
        hospital_id: scan.hospital_id,
        scanned_by: scan.scanned_by,
        status_at_scan: scan.status_at_scan,
        location: scan.location,
        notes: scan.notes,
      },
      headers: { "Content-Type": "application/json" },
      created_at: new Date(scan.timestamp).toISOString(),
      retry_count: 0,
      status: "pending",
    });
    await removeQueuedScan(scan.id);
    migrated++;
  }

  window.dispatchEvent(new CustomEvent(SYNC_QUEUE_CHANGED));
  return migrated;
}
