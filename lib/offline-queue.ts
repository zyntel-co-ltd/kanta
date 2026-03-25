/**
 * Offline scan queue — IndexedDB storage for scans made without connectivity.
 * Flushes to /api/v1/scans when online. Hospital WiFi in wards is unreliable.
 */

const DB_NAME = "kanta-offline-queue";
const STORE_NAME = "pending_scans";
const DB_VERSION = 1;

export type QueuedScan = {
  id: string;
  equipment_id: string;
  hospital_id: string;
  scanned_by: string;
  status_at_scan: string;
  location?: string;
  notes?: string;
  timestamp: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function enqueueScan(scan: Omit<QueuedScan, "id" | "timestamp">): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const queued: QueuedScan = {
    ...scan,
    id: `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
  };
  store.add(queued);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingScans(): Promise<QueuedScan[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const req = store.getAll();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueuedScan(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function flushQueue(
  postFn: (scan: QueuedScan) => Promise<{ data: { id: string } | null; error: string | null }>
): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingScans();
  let synced = 0;
  let failed = 0;

  for (const scan of pending) {
    const res = await postFn(scan);
    if (res.data && !res.error) {
      await removeQueuedScan(scan.id);
      synced++;
    } else {
      failed++;
    }
  }

  return { synced, failed };
}
