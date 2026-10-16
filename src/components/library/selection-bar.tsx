"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fetchDownloadUrl, startDownload } from "@/components/files/use-item-actions";
import { useSelection } from "@/components/library/selection";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { apiRequest, ApiError } from "@/lib/api/client";
import type { FileItem } from "@/lib/files/constants";
import { cn } from "@/lib/cn";

/** Browsers ask before allowing many downloads at once; this keeps a batch reasonable. */
const MAX_BULK_DOWNLOADS = 20;
const DOWNLOAD_GAP_MS = 600;
const MAX_BULK_DELETE = 100;

interface BulkDeleteResult {
  deleted: string[];
  failed: Array<{ id: string; code: string; message: string }>;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Bulk actions for selected items. Covers the tab bar on phones; floats at the bottom on larger screens. */
export function SelectionBar({ pageItems }: { pageItems: FileItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const { selecting, selected, selectAll, clear, stop } = useSelection();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<null | "download" | "delete">(null);
  const [failures, setFailures] = useState<BulkDeleteResult["failed"]>([]);

  if (!selecting) return null;

  const items = [...selected.values()];
  const count = items.length;
  const allOnPageSelected = pageItems.length > 0 && pageItems.every((item) => selected.has(item.id));

  async function downloadAll() {
    const downloadable = items.filter((item) => item.kind === "note" || item.secureUrl !== null);
    if (downloadable.length === 0) {
      toast.show("Links don't have files to download.", "error");
      return;
    }
    const batch = downloadable.slice(0, MAX_BULK_DOWNLOADS);
    setBusy("download");
    let failed = 0;
    for (const item of batch) {
      try {
        startDownload(await fetchDownloadUrl(item.id));
      } catch {
        failed += 1;
      }
      await sleep(DOWNLOAD_GAP_MS);
    }
    setBusy(null);
    const skipped = downloadable.length - batch.length;
    if (failed > 0) toast.show(`${batch.length - failed} downloads started, ${failed} failed. Try those again.`, "error");
    else if (skipped > 0) toast.show(`Started the first ${batch.length} downloads. Select the rest and download again.`);
    else toast.show(batch.length === 1 ? "Download started." : `${batch.length} downloads started. Your browser may ask to allow them.`);
  }

  async function deleteAll() {
    setBusy("delete");
    setFailures([]);
    try {
      const ids = items.slice(0, MAX_BULK_DELETE).map((item) => item.id);
      const result = await apiRequest<BulkDeleteResult>("/api/files/bulk-delete", { method: "POST", body: { ids } });
      router.refresh();
      if (result.failed.length === 0) {
        toast.show(result.deleted.length === 1 ? "Deleted 1 item." : `Deleted ${result.deleted.length} items.`);
        setConfirming(false);
        stop();
      } else {
        // Keep only the failed items selected, so "Try again" retries exactly those.
        clear();
        selectAll(items.filter((item) => result.failed.some((failure) => failure.id === item.id)));
        setFailures(result.failed);
      }
    } catch (error) {
      setFailures([{ id: "", code: "request_failed", message: error instanceof ApiError ? error.message : "Couldn't delete. Try again." }]);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div
        role="toolbar"
        aria-label="Selected items"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex items-center gap-1.5 bg-primary px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] text-primary-foreground shadow-float",
          "lg:inset-x-auto lg:bottom-6 lg:left-1/2 lg:-translate-x-1/2 lg:rounded-2xl lg:py-2 lg:pl-4 lg:pr-2",
          "animate-toast-in",
        )}
      >
        <p className="min-w-0 flex-1 truncate text-sm font-semibold lg:min-w-28" aria-live="polite">
          {count === 0 ? "Select items" : `${count} selected`}
        </p>
        <button
          type="button"
          onClick={() => (allOnPageSelected ? clear() : selectAll(pageItems))}
          disabled={pageItems.length === 0}
          className="h-9 rounded-[0.6rem] px-3 text-xs font-medium transition-colors hover:bg-primary-foreground/10 disabled:opacity-50"
        >
          {allOnPageSelected ? "Clear" : "Select all"}
        </button>
        <button
          type="button"
          onClick={downloadAll}
          disabled={count === 0 || busy === "download"}
          aria-busy={busy === "download" || undefined}
          className="inline-flex h-9 items-center gap-1.5 rounded-[0.6rem] bg-primary-foreground/10 px-3 text-xs font-medium transition-colors hover:bg-primary-foreground/20 disabled:opacity-50"
        >
          <Icon name="download" className={cn("size-4", busy === "download" && "animate-pulse")} />
          <span className="hidden sm:inline">Download</span>
          <span className="sr-only sm:hidden">Download selected</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setFailures([]);
            setConfirming(true);
          }}
          disabled={count === 0}
          className="inline-flex h-9 items-center gap-1.5 rounded-[0.6rem] bg-danger-solid px-3 text-xs font-medium text-white transition-[filter] hover:brightness-110 disabled:opacity-50"
        >
          <Icon name="trash" className="size-4" />
          <span className="hidden sm:inline">Delete</span>
          <span className="sr-only sm:hidden">Delete selected</span>
        </button>
        <button
          type="button"
          onClick={stop}
          aria-label="Stop selecting"
          className="grid size-9 place-items-center rounded-[0.6rem] transition-colors hover:bg-primary-foreground/10"
        >
          <Icon name="close" className="size-[1.125rem]" />
        </button>
      </div>

      <Dialog
        open={confirming}
        onClose={() => (busy ? undefined : setConfirming(false))}
        title={count === 1 ? "Delete 1 item?" : `Delete ${count} items?`}
        description="Files are removed from storage and from your library. This can't be undone."
      >
        <div className="space-y-5">
          {count > MAX_BULK_DELETE ? (
            <p className="rounded-control bg-warning-soft px-3 py-2 text-sm text-foreground">
              Only the first {MAX_BULK_DELETE} are deleted now. Delete the rest afterwards.
            </p>
          ) : null}
          {failures.length > 0 ? (
            <div role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger">
              <p className="font-medium">
                {failures[0].id ? `${failures.length} couldn't be deleted` : "Couldn't delete"}
              </p>
              <p className="mt-1">{failures[0].message}</p>
            </div>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" size="lg" className="sm:h-10 sm:px-4 sm:text-sm" onClick={() => setConfirming(false)} disabled={busy === "delete"}>
              Cancel
            </Button>
            <Button variant="danger" size="lg" className="sm:h-10 sm:px-4 sm:text-sm" onClick={deleteAll} loading={busy === "delete"}>
              {failures.length > 0 ? "Try again" : "Delete"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
