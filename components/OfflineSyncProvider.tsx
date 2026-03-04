"use client";

import { useEffect, useState } from "react";
import { flushQueue } from "@/lib/offline-queue";
import { logScan } from "@/lib/api";

/**
 * Watches connectivity and flushes offline scan queue when back online.
 * Shows "N offline scans synced" via a toast/notification when complete.
 */
export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const [lastSyncCount, setLastSyncCount] = useState<number | null>(null);

  useEffect(() => {
    const handleOnline = async () => {
      const { synced } = await flushQueue(async (scan) => {
        return logScan({
          equipment_id: scan.equipment_id,
          hospital_id: scan.hospital_id,
          scanned_by: scan.scanned_by,
          status_at_scan: scan.status_at_scan,
          location: scan.location,
          notes: scan.notes,
        });
      });
      if (synced > 0) {
        setLastSyncCount(synced);
        setTimeout(() => setLastSyncCount(null), 5000);
      }
    };

    window.addEventListener("online", handleOnline);
    if (navigator.onLine) {
      handleOnline();
    }
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return (
    <>
      {children}
      {lastSyncCount !== null && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium shadow-lg animate-slide-up"
          role="status"
          aria-live="polite"
        >
          {lastSyncCount} offline scan{lastSyncCount !== 1 ? "s" : ""} synced
        </div>
      )}
    </>
  );
}
