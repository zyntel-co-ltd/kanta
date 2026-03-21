"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export type SyncStatus = "synced" | "pending" | "failed";

type SyncStatusContextValue = {
  status: SyncStatus;
  pendingCount: number;
  setPending: (count: number) => void;
  setFailed: (failed: boolean) => void;
  retry: () => void;
};

const SyncStatusContext = createContext<SyncStatusContextValue | null>(null);

export function SyncStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>("synced");
  const [pendingCount, setPendingCount] = useState(0);
  const [failed, setFailedState] = useState(false);

  const setPending = useCallback((count: number) => {
    setPendingCount(count);
    setStatus(count > 0 ? "pending" : failed ? "failed" : "synced");
  }, [failed]);

  const setFailed = useCallback((f: boolean) => {
    setFailedState(f);
    setStatus(f ? "failed" : pendingCount > 0 ? "pending" : "synced");
  }, [pendingCount]);

  const retry = useCallback(() => {
    setFailedState(false);
    setStatus(pendingCount > 0 ? "pending" : "synced");
  }, [pendingCount]);

  useEffect(() => {
    if (pendingCount > 0 && !failed) setStatus("pending");
    else if (failed) setStatus("failed");
    else setStatus("synced");
  }, [pendingCount, failed]);

  return (
    <SyncStatusContext.Provider
      value={{ status, pendingCount, setPending, setFailed, retry }}
    >
      {children}
    </SyncStatusContext.Provider>
  );
}

export function useSyncStatus() {
  const ctx = useContext(SyncStatusContext);
  return ctx ?? { status: "synced" as SyncStatus, pendingCount: 0, setPending: () => {}, setFailed: () => {}, retry: () => {} };
}
