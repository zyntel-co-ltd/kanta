"use client";

import {
  listPendingOrdered,
  removePendingSync,
  updatePendingSync,
} from "./db";

const MAX_RETRIES = 5;

function fullUrl(endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  return `${window.location.origin}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
}

/**
 * Replay FIFO pending writes with raw fetch (never queuedFetch).
 */
export async function flushPendingSyncs(): Promise<{
  synced: number;
  failedAttempts: number;
}> {
  if (typeof window === "undefined") {
    return { synced: 0, failedAttempts: 0 };
  }

  const pending = await listPendingOrdered();
  let synced = 0;
  let failedAttempts = 0;

  for (const item of pending) {
    try {
      const res = await fetch(fullUrl(item.endpoint), {
        method: item.method,
        headers: {
          "Content-Type": "application/json",
          ...(item.headers ?? {}),
        },
        body: item.body != null ? JSON.stringify(item.body) : undefined,
        credentials: "include",
        cache: "no-store",
      });

      if (res.ok) {
        await removePendingSync(item.id);
        synced++;
        continue;
      }

      if (res.status >= 400 && res.status < 500) {
        await updatePendingSync({
          ...item,
          retry_count: MAX_RETRIES,
          status: "failed",
        });
        failedAttempts++;
        continue;
      }

      const nextRetry = item.retry_count + 1;
      if (nextRetry >= MAX_RETRIES) {
        await updatePendingSync({
          ...item,
          retry_count: nextRetry,
          status: "failed",
        });
      } else {
        await updatePendingSync({
          ...item,
          retry_count: nextRetry,
        });
      }
      failedAttempts++;
    } catch {
      const nextRetry = item.retry_count + 1;
      if (nextRetry >= MAX_RETRIES) {
        await updatePendingSync({
          ...item,
          retry_count: nextRetry,
          status: "failed",
        });
      } else {
        await updatePendingSync({
          ...item,
          retry_count: nextRetry,
        });
      }
      failedAttempts++;
    }
  }

  return { synced, failedAttempts };
}
