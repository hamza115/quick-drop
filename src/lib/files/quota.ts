// Client-safe. Storage usage for one account, compared with the optional STORAGE_LIMIT_MB setting.

export const QUOTA_WARNING_RATIO = 0.8;

export type QuotaLevel = "none" | "ok" | "warning" | "full";

export interface StorageStatus {
  count: number;
  /** Bytes stored by this account (stored size after compression). */
  bytes: number;
  /** Null when no limit is configured. */
  limitBytes: number | null;
  level: QuotaLevel;
}

export function quotaLevel(bytes: number, limitBytes: number | null): QuotaLevel {
  if (limitBytes === null) return "none";
  if (bytes >= limitBytes) return "full";
  if (bytes >= limitBytes * QUOTA_WARNING_RATIO) return "warning";
  return "ok";
}

export function storageStatus(count: number, bytes: number, limitBytes: number | null): StorageStatus {
  return { count, bytes, limitBytes, level: quotaLevel(bytes, limitBytes) };
}

/** True when adding a file of this size would go over the limit. */
export function wouldExceedQuota(bytes: number, addBytes: number, limitBytes: number | null): boolean {
  return limitBytes !== null && bytes + addBytes > limitBytes;
}

export function limitBytesFromMb(limitMb: number | undefined): number | null {
  return limitMb === undefined ? null : limitMb * 1024 * 1024;
}
