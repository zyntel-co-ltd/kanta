"use client";

import { useCallback } from "react";
import { queuedFetch, responseWasQueued } from "@/lib/sync-queue/queuedFetch";

const SCANS_URL = "/api/v1/scans";

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
 * Logs a scan via `queuedFetch` — offline or network failure enqueues to IndexedDB (ENG-63).
 */
export function useLogScan() {
  return useCallback(async (payload: ScanPayload): Promise<LogScanResult> => {
    const res = await queuedFetch(SCANS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as {
      data?: unknown;
      error?: string | null;
      queued?: boolean;
    };
    if (responseWasQueued(res)) {
      return { success: true, queued: true };
    }
    if (json.data && !json.error) return { success: true };
    return { success: false, error: json.error ?? "Failed to log scan" };
  }, []);
}
