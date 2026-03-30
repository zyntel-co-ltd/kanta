"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  countFailedSyncs,
  countPendingSyncs,
  resetFailedToPending,
} from "@/lib/sync-queue/db";
import { flushPendingSyncs } from "@/lib/sync-queue/flush";
import { migrateLegacyScansToNewQueue } from "@/lib/sync-queue/migrateLegacy";
import {
  SYNC_QUEUE_CHANGED,
  SYNC_QUEUED_TOAST,
} from "@/lib/sync-queue/types";

const HEALTHCHECK = "/api/healthcheck";
const PROBE_MS = 30_000;

export type DashboardSyncStatus = "idle" | "syncing" | "error";

type SyncQueueContextValue = {
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  syncStatus: DashboardSyncStatus;
  refreshCounts: () => Promise<void>;
  retryFailedSyncs: () => Promise<void>;
  requestFlush: () => Promise<void>;
};

const SyncQueueContext = createContext<SyncQueueContextValue | null>(null);

async function probeReachable(): Promise<boolean> {
  try {
    const res = await fetch(HEALTHCHECK, { method: "GET", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export function SyncQueueProvider({ children }: { children: ReactNode }) {
  const [navigatorOnline, setNavigatorOnline] = useState(true);
  const [probeOk, setProbeOk] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<DashboardSyncStatus>("idle");
  const [queuedToastVisible, setQueuedToastVisible] = useState(false);
  const [flushToast, setFlushToast] = useState<string | null>(null);
  const flushingRef = useRef(false);

  const isOnline = navigatorOnline && probeOk;

  const refreshCounts = useCallback(async () => {
    const [p, f] = await Promise.all([countPendingSyncs(), countFailedSyncs()]);
    setPendingCount(p);
    setFailedCount(f);
    setSyncStatus((prev) => (prev === "syncing" ? prev : f > 0 ? "error" : "idle"));
  }, []);

  const runFlush = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (flushingRef.current) return;
    if (!navigator.onLine) return;
    const reachable = await probeReachable();
    if (!reachable) return;

    flushingRef.current = true;
    setSyncStatus("syncing");
    try {
      const legacy = await migrateLegacyScansToNewQueue();
      const { synced } = await flushPendingSyncs();
      if (legacy > 0) {
        setFlushToast(
          `${legacy} offline scan${legacy !== 1 ? "s" : ""} synced`
        );
      } else if (synced > 0) {
        setFlushToast(`${synced} change${synced !== 1 ? "s" : ""} synced`);
      }
    } finally {
      flushingRef.current = false;
      const [p, f] = await Promise.all([countPendingSyncs(), countFailedSyncs()]);
      setPendingCount(p);
      setFailedCount(f);
      setSyncStatus(f > 0 ? "error" : "idle");
    }
  }, []);

  const requestFlush = useCallback(async () => {
    await runFlush();
  }, [runFlush]);

  const retryFailedSyncs = useCallback(async () => {
    await resetFailedToPending();
    await refreshCounts();
    await runFlush();
  }, [refreshCounts, runFlush]);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts]);

  useEffect(() => {
    const onChange = () => void refreshCounts();
    window.addEventListener(SYNC_QUEUE_CHANGED, onChange);
    return () => window.removeEventListener(SYNC_QUEUE_CHANGED, onChange);
  }, [refreshCounts]);

  useEffect(() => {
    const onQueued = () => setQueuedToastVisible(true);
    window.addEventListener(SYNC_QUEUED_TOAST, onQueued);
    return () => window.removeEventListener(SYNC_QUEUED_TOAST, onQueued);
  }, []);

  useEffect(() => {
    if (!queuedToastVisible) return;
    const t = window.setTimeout(() => setQueuedToastVisible(false), 4500);
    return () => window.clearTimeout(t);
  }, [queuedToastVisible]);

  useEffect(() => {
    if (!flushToast) return;
    const t = window.setTimeout(() => setFlushToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [flushToast]);

  useEffect(() => {
    const syncNav = () => setNavigatorOnline(navigator.onLine);
    window.addEventListener("online", syncNav);
    window.addEventListener("offline", syncNav);
    setNavigatorOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", syncNav);
      window.removeEventListener("offline", syncNav);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const ok = await probeReachable();
      if (!cancelled) setProbeOk(ok);
    };
    void tick();
    const id = window.setInterval(tick, PROBE_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    const prev = prevOnlineRef.current;
    prevOnlineRef.current = isOnline;
    if (isOnline && !prev) {
      void runFlush();
    }
  }, [isOnline, runFlush]);

  useEffect(() => {
    if (!isOnline || pendingCount <= 0) return;
    if (flushingRef.current) return;
    const id = window.setTimeout(() => void runFlush(), 500);
    return () => window.clearTimeout(id);
  }, [isOnline, pendingCount, runFlush]);

  const value: SyncQueueContextValue = {
    isOnline,
    pendingCount,
    failedCount,
    syncStatus,
    refreshCounts,
    retryFailedSyncs,
    requestFlush,
  };

  return (
    <SyncQueueContext.Provider value={value}>
      {children}
      {queuedToastVisible && (
        <div
          className="fixed bottom-4 left-1/2 z-[100] max-w-[min(92vw,420px)] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg"
          role="status"
          aria-live="polite"
        >
          Saved locally — will sync when online
        </div>
      )}
      {flushToast && (
        <div
          className="fixed bottom-4 left-1/2 z-[100] max-w-[min(92vw,420px)] -translate-x-1/2 rounded-xl bg-emerald-600 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg"
          role="status"
          aria-live="polite"
        >
          {flushToast}
        </div>
      )}
    </SyncQueueContext.Provider>
  );
}

export function useSyncQueue() {
  const ctx = useContext(SyncQueueContext);
  if (!ctx) {
    return {
      isOnline: true,
      pendingCount: 0,
      failedCount: 0,
      syncStatus: "idle" as DashboardSyncStatus,
      refreshCounts: async () => {},
      retryFailedSyncs: async () => {},
      requestFlush: async () => {},
    };
  }
  return ctx;
}
