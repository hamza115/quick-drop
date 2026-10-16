import "server-only";
import { getCloudinaryAdmin } from "@/lib/cloudinary/server";

/** One metric from Cloudinary's usage report. Limits are present only on some plans. */
export interface UsageMetric {
  usage: number;
  /** Credits this metric used, on credit-based plans. */
  credits: number | null;
  limit: number | null;
  usedPercent: number | null;
}

/** Account-wide Cloudinary usage, covering every QuickDrop user's files. */
export interface CloudinaryUsage {
  plan: string;
  /** When Cloudinary last recalculated the figures (it does so a few times a day). */
  lastUpdated: string | null;
  /** Monthly credits on credit-based plans such as Free. Null on plans without credits. */
  credits: UsageMetric | null;
  /** Bytes stored. */
  storage: UsageMetric;
  /** Bytes delivered this billing cycle. */
  bandwidth: UsageMetric;
  transformations: UsageMetric;
  /** Number of stored files, not counting generated versions such as thumbnails. */
  files: number;
}

/** The Admin API allows a limited number of calls per hour, so usage is cached per server instance. */
const CACHE_MS = 10 * 60_000;
let cached: { at: number; value: CloudinaryUsage } | null = null;

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function metric(raw: unknown): UsageMetric {
  const data = (raw ?? {}) as Record<string, unknown>;
  return {
    usage: toNumber(data.usage) ?? 0,
    credits: toNumber(data.credits_usage),
    limit: toNumber(data.limit),
    usedPercent: toNumber(data.used_percent),
  };
}

function normalise(raw: Record<string, unknown>): CloudinaryUsage {
  const credits = raw.credits ? metric(raw.credits) : null;
  return {
    plan: typeof raw.plan === "string" ? raw.plan : "Unknown",
    lastUpdated: typeof raw.last_updated === "string" ? raw.last_updated : null,
    credits,
    storage: metric(raw.storage),
    bandwidth: metric(raw.bandwidth),
    transformations: metric(raw.transformations),
    files: toNumber(raw.resources) ?? 0,
  };
}

/** Cloudinary usage, at most 10 minutes old. Null when Cloudinary is not configured or the call fails. */
export async function getCloudinaryUsage(): Promise<CloudinaryUsage | null> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  try {
    const raw = (await getCloudinaryAdmin().api.usage()) as Record<string, unknown>;
    const value = normalise(raw);
    cached = { at: Date.now(), value };
    return value;
  } catch (error) {
    console.error("[cloudinary] usage report failed:", error instanceof Error ? error.message : error);
    // An older figure beats none while Cloudinary is unreachable or rate limited.
    return cached?.value ?? null;
  }
}
