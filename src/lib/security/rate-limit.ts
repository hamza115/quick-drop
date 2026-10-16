import "server-only";
import type { Collection } from "mongodb";
import { getDb } from "@/lib/db/mongodb";

/*
 * Fixed-window rate limits stored in MongoDB, so they hold across serverless instances.
 * One small document per user, action and window; MongoDB removes old windows by TTL.
 */

const COLLECTION = "rateLimits";

interface RateLimitDocument {
  _id: string;
  count: number;
  expiresAt: Date;
}

export interface RateLimitRule {
  /** Short name, for example "upload-sign". */
  action: string;
  limit: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  uploadSign: { action: "upload-sign", limit: 120, windowMs: 10 * 60 * 1000 },
  createItem: { action: "create-item", limit: 120, windowMs: 10 * 60 * 1000 },
  deleteItem: { action: "delete-item", limit: 200, windowMs: 10 * 60 * 1000 },
  download: { action: "download", limit: 300, windowMs: 10 * 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>;

let indexReady: Promise<void> | undefined;

async function rateLimits(): Promise<Collection<RateLimitDocument>> {
  const collection = getDb().collection<RateLimitDocument>(COLLECTION);
  indexReady ??= collection
    .createIndex({ expiresAt: 1 }, { name: "expiresAt_ttl", expireAfterSeconds: 0 })
    .then(() => undefined)
    .catch((error: unknown) => {
      indexReady = undefined;
      throw error;
    });
  await indexReady;
  return collection;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the current window ends. */
  retryAfterSeconds: number;
}

/** Counts one request. Returns allowed: false once the limit for the current window is reached. */
export async function consumeRateLimit(userId: string, rule: RateLimitRule, now = Date.now()): Promise<RateLimitResult> {
  const windowStart = Math.floor(now / rule.windowMs) * rule.windowMs;
  const windowEnd = windowStart + rule.windowMs;
  const collection = await rateLimits();

  const doc = await collection.findOneAndUpdate(
    { _id: `${rule.action}:${userId}:${windowStart}` },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowEnd) } },
    { upsert: true, returnDocument: "after" },
  );

  return {
    allowed: (doc?.count ?? 1) <= rule.limit,
    retryAfterSeconds: Math.max(1, Math.ceil((windowEnd - now) / 1000)),
  };
}
