"use client";

import { useCallback } from "react";
import { logScan } from "./api";
import { enqueueScan } from "./offline-queue";

type ScanPayload = {
  equipment_id: string;
  hospital_id: string;
  scanned_by: string;
  status_at_scan: string;
  location?: string;
  notes?: string;
};

type LogScanResult = { success: boolean; queued?: boolean; error?: string };

/**
 * Logs a scan — online: POSTs to API. Offline: queues in IndexedDB for sync on reconnect.
 */
export function useLogScan() {
  return useCallback(
    async (payload: ScanPayload): Promise<LogScanResult> => {
      if (navigator.onLine) {
        const res = await logScan(payload);
        if (res.data && !res.error) return { success: true };
        return { success: false, error: res.error ?? "Failed to log scan" };
      }

      await enqueueScan(payload);
      return { success: true, queued: true };
    },
    []
  );
}
