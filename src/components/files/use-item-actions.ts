"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useSyncExternalStore } from "react";
import { useToast } from "@/components/ui/toast";
import { apiRequest, ApiError } from "@/lib/api/client";
import { canCopyImages, copyImageFromUrl, copyText } from "@/lib/clipboard";
import type { FileItem } from "@/lib/files/constants";

function subscribeNever(): () => void {
  return () => {};
}

/** Starts a download without leaving the page. Attachment responses never replace the frame's page. */
export function startDownload(url: string): void {
  const frame = document.createElement("iframe");
  frame.hidden = true;
  frame.src = url;
  document.body.append(frame);
  // Long enough for the browser to start the download; the frame is removed afterwards.
  window.setTimeout(() => frame.remove(), 60_000);
}

/** Asks the server for a download URL. Throws ApiError with a readable message. */
export async function fetchDownloadUrl(itemId: string): Promise<string> {
  const { url } = await apiRequest<{ url: string }>(`/api/files/${itemId}/download?mode=json`);
  return url;
}

/** What "Copy link" copies for each kind, or null when there is nothing to copy. */
export function copyTargetFor(item: FileItem): { value: string; label: string; done: string } | null {
  if (item.kind === "link") return item.linkUrl ? { value: item.linkUrl, label: "Copy link", done: "Link copied." } : null;
  if (item.kind === "note") return item.note ? { value: item.note, label: "Copy text", done: "Text copied." } : null;
  if (!item.secureUrl) return null;
  // Private files: the link opens only for the signed-in owner.
  const absolute = typeof window === "undefined" ? item.secureUrl : new URL(item.secureUrl, window.location.origin).href;
  return { value: absolute, label: "Copy link", done: "Link copied. It opens only when you're signed in." };
}

/** Copy, download and favourite actions shared by the file page and the library menus. */
export function useItemActions(item: FileItem) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<null | "copy-image" | "download" | "favorite">(null);
  // Known only in the browser; server-rendered markup shows no Copy image action.
  const imageClipboard = useSyncExternalStore(subscribeNever, canCopyImages, () => false);

  const copyTarget = copyTargetFor(item);
  const canCopyImage = item.kind === "image" && item.secureUrl !== null && imageClipboard;
  const canDownload = item.kind === "note" || item.secureUrl !== null;

  const copy = useCallback(async () => {
    const target = copyTargetFor(item);
    if (!target) return;
    try {
      await copyText(target.value);
      toast.show(target.done);
    } catch {
      toast.show("Clipboard isn't available here. Select the text and copy it manually.", "error");
    }
  }, [item, toast]);

  const copyImage = useCallback(async () => {
    if (!item.secureUrl) return;
    setBusy("copy-image");
    try {
      await copyImageFromUrl(item.secureUrl);
      toast.show("Image copied.");
    } catch {
      // Permission, image format or CORS can block image copies. The link is the next best thing.
      const target = copyTargetFor(item);
      try {
        if (!target) throw new Error("no link");
        await copyText(target.value);
        toast.show("Your browser didn't allow copying the image, so its link was copied instead.", "error");
      } catch {
        toast.show("Clipboard isn't available here. Use Download instead.", "error");
      }
    } finally {
      setBusy(null);
    }
  }, [item, toast]);

  const download = useCallback(async () => {
    setBusy("download");
    try {
      startDownload(await fetchDownloadUrl(item.id));
      toast.show("Download started.");
    } catch (error) {
      toast.show(error instanceof ApiError ? error.message : "Couldn't start the download. Try again.", "error");
    } finally {
      setBusy(null);
    }
  }, [item.id, toast]);

  const toggleFavorite = useCallback(async () => {
    setBusy("favorite");
    try {
      await apiRequest<{ item: FileItem }>(`/api/files/${item.id}`, {
        method: "PATCH",
        body: { isFavorite: !item.isFavorite },
      });
      toast.show(item.isFavorite ? "Removed from favorites." : "Added to favorites.");
      router.refresh();
    } catch (error) {
      toast.show(error instanceof ApiError ? error.message : "Couldn't update favorites.", "error");
    } finally {
      setBusy(null);
    }
  }, [item.id, item.isFavorite, router, toast]);

  return { busy, copyTarget, canCopyImage, canDownload, copy, copyImage, download, toggleFavorite };
}
