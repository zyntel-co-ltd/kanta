"use client";

import { addPendingSync } from "./db";
import type { PendingSyncMethod } from "./types";
import { SYNC_QUEUE_CHANGED, SYNC_QUEUED_TOAST } from "./types";

const WRITE_METHODS = new Set(["POST", "PATCH", "DELETE", "PUT"]);

function isWriteMethod(m: string): boolean {
  return WRITE_METHODS.has(m.toUpperCase());
}

function parseBodyForStore(body: BodyInit | null | undefined): unknown {
  if (body == null) return null;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return null;
}

function extractHeaders(init?: RequestInit): Record<string, string> | undefined {
  const h = init?.headers;
  if (!h) return { "Content-Type": "application/json" };
  if (h instanceof Headers) {
    const o: Record<string, string> = {};
    h.forEach((v, k) => {
      o[k] = v;
    });
    return Object.keys(o).length ? o : { "Content-Type": "application/json" };
  }
  if (Array.isArray(h)) {
    return Object.fromEntries(h);
  }
  return { ...h };
}

function resolveEndpoint(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    if (input.startsWith("http://") || input.startsWith("https://")) {
      try {
        return new URL(input).pathname + new URL(input).search;
      } catch {
        return input;
      }
    }
    return input;
  }
  if (input instanceof URL) {
    return input.pathname + input.search;
  }
  return String(input);
}

function syntheticQueuedResponse(): Response {
  return new Response(JSON.stringify({ ok: true, queued: true, local: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-Queued": "1",
    },
  });
}

function notifyQueueChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SYNC_QUEUE_CHANGED));
  }
}

function notifyQueuedToast(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SYNC_QUEUED_TOAST));
  }
}

/**
 * Opt-in wrapper for mutating API calls. GET requests pass through to `fetch`.
 * On offline or network failure: enqueue to IndexedDB and return a synthetic 200 JSON body
 * so callers using `res.ok` / `res.json()` continue to work.
 */
export async function queuedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();

  if (!isWriteMethod(method)) {
    return fetch(input, {
      ...init,
      credentials: init?.credentials ?? "include",
    });
  }

  if (typeof window === "undefined") {
    return fetch(input, init);
  }

  const endpoint = resolveEndpoint(input);
  const m = method as PendingSyncMethod;
  const body = parseBodyForStore(init?.body ?? null);
  const headers = extractHeaders(init);

  const tryLive = () =>
    fetch(input, {
      ...init,
      credentials: init?.credentials ?? "include",
      cache: "no-store",
    });

  if (!navigator.onLine) {
    const id = crypto.randomUUID();
    await addPendingSync({
      id,
      endpoint,
      method: m,
      body,
      headers,
      created_at: new Date().toISOString(),
      retry_count: 0,
      status: "pending",
    });
    notifyQueueChanged();
    notifyQueuedToast();
    return syntheticQueuedResponse();
  }

  try {
    const res = await tryLive();
    if (res.ok) return res;
    if (res.status >= 400 && res.status < 500) {
      return res;
    }
    const id = crypto.randomUUID();
    await addPendingSync({
      id,
      endpoint,
      method: m,
      body,
      headers,
      created_at: new Date().toISOString(),
      retry_count: 0,
      status: "pending",
    });
    notifyQueueChanged();
    notifyQueuedToast();
    return syntheticQueuedResponse();
  } catch {
    const id = crypto.randomUUID();
    await addPendingSync({
      id,
      endpoint,
      method: m,
      body,
      headers,
      created_at: new Date().toISOString(),
      retry_count: 0,
      status: "pending",
    });
    notifyQueueChanged();
    notifyQueuedToast();
    return syntheticQueuedResponse();
  }
}

export function responseWasQueued(res: Response): boolean {
  return res.headers.get("X-Queued") === "1";
}
