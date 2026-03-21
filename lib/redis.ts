/**
 * Upstash Redis — caching, rate limiting, idempotency.
 * Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
 */

import { Redis } from "@upstash/redis";

const rawUrl = process.env.UPSTASH_REDIS_REST_URL;
const rawToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const url = rawUrl?.replace(/^["']+|["']+$/g, "").trim() || undefined;
const token = rawToken?.replace(/^["']+|["']+$/g, "").trim() || undefined;

const mockRedis = {
  get: async () => null,
  set: async () => "OK",
  del: async () => 0,
  ping: async () => "PONG",
  incrby: async () => 0,
  expire: async () => true,
} as unknown as Redis;

function createRedisClient(): Redis {
  if (!url || !token || !url.startsWith("https")) return mockRedis;
  try {
    return new Redis({ url, token });
  } catch {
    return mockRedis;
  }
}

export const redis = createRedisClient();
