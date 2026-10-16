"use client";

import { useUploads } from "@/components/uploads/upload-provider";
import { Icon } from "@/components/ui/icons";
import { ACTIVE_STATUSES } from "@/lib/uploads/state";
import { cn } from "@/lib/cn";

/** Bell in the top bar: shows or hides the upload queue. Green dot = uploads running, red = a failure. */
export function UploadsIndicator() {
  const { items, queueOpen, setQueueOpen } = useUploads();
  const active = items.filter((item) => ACTIVE_STATUSES.has(item.status) || item.status === "waiting").length;
  const failed = items.some((item) => item.status === "failed");

  return (
    <button
      type="button"
      onClick={() => setQueueOpen(!queueOpen)}
      disabled={items.length === 0}
      aria-pressed={items.length > 0 ? queueOpen : undefined}
      aria-label={items.length === 0 ? "No uploads" : active > 0 ? `Uploads: ${active} in progress` : "Uploads"}
      title={items.length === 0 ? "No uploads yet" : "Uploads"}
      className="relative grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-container hover:text-foreground disabled:hover:bg-transparent disabled:hover:text-muted"
    >
      <Icon name="bell" className="size-5" />
      {active > 0 || failed ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute right-1.5 top-1.5 size-1.5 rounded-full",
            failed && active === 0 ? "bg-danger-solid" : "animate-pulse bg-live motion-reduce:animate-none",
          )}
        />
      ) : null}
    </button>
  );
}
