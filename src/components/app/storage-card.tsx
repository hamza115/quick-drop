import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { formatBytes } from "@/lib/files/format";
import type { StorageStatus } from "@/lib/files/quota";
import { cn } from "@/lib/cn";

interface StorageCardProps {
  storage: StorageStatus;
  /** "compact" for the sidebar, "mini" for the collapsed icon rail, "full" for Settings. */
  variant?: "compact" | "mini" | "full";
}

export function StorageCard({ storage, variant = "full" }: StorageCardProps) {
  const { count, bytes, limitBytes, level } = storage;
  const percent = limitBytes ? Math.min(100, Math.round((bytes / limitBytes) * 100)) : null;
  const fill = level === "full" ? "bg-danger-solid" : level === "warning" ? "bg-warning" : "bg-primary";

  const meter =
    percent !== null ? (
      <div
        role="meter"
        aria-label="Storage used"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}% used`}
        className={cn("overflow-hidden rounded-full bg-surface-highest", variant === "compact" ? "h-1.5" : "h-2")}
      >
        <div className={cn("h-full rounded-full transition-[width]", fill)} style={{ width: `${Math.max(percent, 2)}%` }} />
      </div>
    ) : null;

  const warning =
    level === "full" ? (
      <p className="text-xs font-medium text-danger">Storage is full. Delete files to upload more.</p>
    ) : level === "warning" ? (
      <p className="text-xs font-medium text-warning">Storage is almost full.</p>
    ) : null;

  if (variant === "mini") {
    const summary = limitBytes
      ? `Storage: ${formatBytes(bytes)} of ${formatBytes(limitBytes)} (${percent}%)`
      : `Storage: ${formatBytes(bytes)} used, no limit`;
    return (
      <Link
        href="/settings#storage"
        title={summary}
        aria-label={summary}
        className="mx-auto flex w-11 flex-col items-center gap-1.5 rounded-lg bg-surface py-2 shadow-soft transition-colors hover:bg-surface-container"
      >
        <Icon name="cloud" className={cn("size-5", level === "full" ? "text-danger" : "text-foreground")} />
        <span className="h-1 w-6 overflow-hidden rounded-full bg-surface-highest" aria-hidden="true">
          <span className={cn("block h-full rounded-full", fill)} style={{ width: `${percent ?? 0}%` }} />
        </span>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <section aria-labelledby="storage-heading" className="flex flex-col gap-2 rounded-lg bg-surface p-3 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 id="storage-heading" className="text-item text-foreground">
            Storage
          </h2>
          <span className="text-caption text-muted">{percent !== null ? `${percent}%` : "No limit"}</span>
        </div>
        {meter ?? <div className="h-1.5 rounded-full bg-surface-highest" aria-hidden="true" />}
        <div className="flex items-center justify-between text-caption text-muted">
          <span className="truncate">{limitBytes ? `${formatBytes(bytes)} of ${formatBytes(limitBytes)}` : `${formatBytes(bytes)} used`}</span>
          <Link href="/settings#storage" className="text-[12px] font-semibold text-foreground hover:underline">
            Manage
          </Link>
        </div>
        {warning}
      </section>
    );
  }

  return (
    <section aria-labelledby="storage-heading" className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="storage-heading" className="text-xs font-medium text-muted">
            Used
          </h2>
          <p className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">{formatBytes(bytes)}</p>
        </div>
        <p className="text-sm text-muted">
          {count} {count === 1 ? "item" : "items"}
          {limitBytes ? ` · ${formatBytes(limitBytes)} limit` : " · no limit"}
        </p>
      </div>
      {meter}
      {warning}
    </section>
  );
}
