/**
 * Upstash Redis — caching, rate limiting, idempotency.
 * Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
 */

import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis =
  url && token
    ? new Redis({ url, token })
    : ({
        get: async () => null,
        set: async () => "OK",
        del: async () => 0,
        ping: async () => "PONG",
        incrby: async () => 0,
        expire: async () => true,
      } as unknown as Redis);
