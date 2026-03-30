"use client";

/**
 * Legacy name kept for app/layout.tsx — sync flush lives in `SyncQueueProvider` (dashboard).
 */
export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
