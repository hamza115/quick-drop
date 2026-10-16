"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { useUploads } from "@/components/uploads/upload-provider";
import type { CompressionSummary } from "@/lib/compression/compress";
import { percentSaved } from "@/lib/compression/plan";
import { KindTile } from "@/components/library/file-type-icon";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/files/format";
import { findUploadRule } from "@/lib/uploads/policy";
import { ACTIVE_STATUSES, isFinished, type UploadItem, type UploadStatus } from "@/lib/uploads/state";

const STATUS_LABELS: Record<UploadStatus, string> = {
  waiting: "Waiting",
  compressing: "Compressing",
  preparing: "Preparing",
  uploading: "Uploading",
  saving: "Saving details",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

function isVideoName(name: string): boolean {
  return /\.(mp4|webm|mov)$/i.test(name);
}

/** Plain-language line about the image step, or null when there is nothing to say. */
function compressionNote(summary: CompressionSummary | null): string | null {
  if (!summary) return null;
  if (summary.outcome === "compressed") {
    const saved = percentSaved(summary.originalBytes, summary.processedBytes);
    const resized = summary.width && summary.height ? ` · resized to ${summary.width}×${summary.height}` : "";
    return `${formatBytes(summary.originalBytes)} → ${formatBytes(summary.processedBytes)} · ${saved}% smaller${resized}`;
  }
  switch (summary.reason) {
    case "larger":
      return "Original kept: compressing wouldn't make it smaller.";
    case "failed":
      return "Couldn't compress this file, so the original is uploaded.";
    case "unsupported":
      return "Original kept: this browser or file type can't be compressed.";
    case "not-needed":
      return "Original kept: already within your maximum size.";
    case "skipped":
      return "Original kept, as you chose.";
    case "device":
      return "Original kept: this device has too little memory to compress videos.";
    case "too-large":
      return "Original kept: this video is too large to compress in the browser.";
    default:
      return null;
  }
}

/** Upload queue panel. It sits in the corner and does not cover the library. */
export function UploadPanel() {
  const { items, cancel, retry, dismiss, clearFinished, skipCompression, queueOpen, setQueueOpen } = useUploads();
  const [collapsed, setCollapsed] = useState(false);

  // Stays mounted while closed so it can animate out. Hidden from assistive tech and keyboard focus.
  if (items.length === 0) return null;

  const active = items.filter((item) => ACTIVE_STATUSES.has(item.status)).length;
  const hasFinished = items.some((item) => isFinished(item.status));

  return (
    <section
      aria-label="Uploads"
      aria-hidden={!queueOpen}
      inert={!queueOpen}
      className={cn(
        "fixed inset-x-3 bottom-nav-offset z-40 flex max-h-[60dvh] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-card border border-border bg-surface shadow-float transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none sm:max-h-[70dvh] lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[22rem]",
        queueOpen ? "animate-toast-in opacity-100" : "pointer-events-none translate-y-3 scale-[0.97] opacity-0",
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border py-2.5 pl-4 pr-2">
        <p className="min-w-0 truncate text-[0.8125rem] font-semibold text-foreground">
          Uploads
          {active > 0 ? <span className="ml-1.5 font-normal text-muted">{active} in progress</span> : null}
        </p>
        <div className="flex items-center gap-0.5">
          {hasFinished ? (
            <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs" onClick={clearFinished}>
              Clear finished
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8"
            aria-expanded={!collapsed}
            aria-controls="upload-queue-list"
            aria-label={collapsed ? "Expand uploads" : "Collapse uploads"}
            onClick={() => setCollapsed((value) => !value)}
          >
            <Icon name="chevronRight" className={collapsed ? "size-4 -rotate-90" : "size-4 rotate-90"} />
          </Button>
          <Button variant="ghost" size="icon-sm" className="size-8" aria-label="Hide uploads" onClick={() => setQueueOpen(false)}>
            <Icon name="close" className="size-4" />
          </Button>
        </div>
      </header>

      {collapsed ? null : (
        <ul id="upload-queue-list" className="divide-y divide-border overflow-y-auto">
          {items.map((item) => (
            <UploadRow
              key={item.id}
              item={item}
              onCancel={cancel}
              onRetry={retry}
              onDismiss={dismiss}
              onSkipCompression={skipCompression}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function UploadRow({
  item,
  onCancel,
  onRetry,
  onDismiss,
  onSkipCompression,
}: {
  item: UploadItem;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
  onSkipCompression: (id: string) => void;
}) {
  const active = ACTIVE_STATUSES.has(item.status) || item.status === "waiting";
  const percent = item.progress === null ? null : Math.round(item.progress * 100);
  const note = compressionNote(item.compression);

  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="relative">
          <KindTile kind={findUploadRule(item.name)?.kind ?? "other"} />
          {item.status === "completed" ? (
            <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-success text-surface ring-2 ring-surface">
              <Icon name="check" className="size-3" />
            </span>
          ) : item.status === "failed" ? (
            <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-danger-solid text-white ring-2 ring-surface">
              <Icon name="alert" className="size-3" />
            </span>
          ) : null}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground" title={item.name}>
            {item.name}
          </p>
          <p className="text-xs text-muted">
            {STATUS_LABELS[item.status]} · {formatBytes(item.size)}
            {(item.status === "uploading" || item.status === "compressing") && percent !== null ? ` · ${percent}%` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {item.status === "compressing" ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSkipCompression(item.id)}
              aria-label={`Upload ${item.name} without compressing`}
            >
              Use original
            </Button>
          ) : null}
          {active ? (
            <Button variant="ghost" size="sm" onClick={() => onCancel(item.id)}>
              Cancel
            </Button>
          ) : null}
          {item.status === "failed" && item.retryable ? (
            <Button variant="secondary" size="sm" onClick={() => onRetry(item.id)}>
              Retry
            </Button>
          ) : null}
          {item.status === "completed" && item.itemId ? (
            <Link href={`/files/${item.itemId}`} className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Open
            </Link>
          ) : null}
          {isFinished(item.status) ? (
            <Button variant="ghost" size="sm" onClick={() => onDismiss(item.id)} aria-label={`Remove ${item.name} from the list`}>
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      {ACTIVE_STATUSES.has(item.status) ? (
        <div
          role="progressbar"
          aria-label={`${item.name}: ${STATUS_LABELS[item.status]}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent ?? undefined}
          aria-valuetext={percent === null ? STATUS_LABELS[item.status] : `${percent}%`}
          className="ml-[3.25rem] h-1.5 overflow-hidden rounded-full bg-surface-muted"
        >
          {percent === null ? (
            <div className="h-full w-1/3 animate-pulse rounded-full bg-foreground/60 motion-reduce:animate-none" />
          ) : (
            <div className="h-full rounded-full bg-foreground transition-[width] duration-150 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
          )}
        </div>
      ) : null}

      {item.status === "compressing" && isVideoName(item.name) ? (
        <p className="ml-[3.25rem] text-xs text-muted">
          Compressing video in your browser. This can take several minutes and slow this device down. Keep this tab
          open, or choose Use original.
        </p>
      ) : null}
      {note ? <p className="ml-[3.25rem] text-xs text-muted">{note}</p> : null}
      {item.error ? <p className="ml-[3.25rem] text-sm text-danger">{item.error}</p> : null}
    </li>
  );
}
