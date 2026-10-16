"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useToast } from "@/components/ui/toast";
import { apiRequest, ApiError } from "@/lib/api/client";
import { keepOriginal, prepareImageForUpload, type PreparedFile } from "@/lib/compression/compress";
import { isCompressibleImage } from "@/lib/compression/plan";
import { prepareVideoForUpload } from "@/lib/compression/video";
import { isCompressibleVideo, MAX_VIDEO_COMPRESSION_INPUT_BYTES } from "@/lib/compression/video-plan";
import {
  getCompressionSettings,
  getServerCompressionSettings,
  subscribeCompressionSettings,
  updateCompressionSettings,
  type CompressionSettings,
} from "@/lib/compression/settings";
import type { FileItem } from "@/lib/files/constants";
import {
  findUploadRule,
  isLikelyUrlText,
  maxSizeLabel,
  supportedTypesDescription,
  type UploadRule,
} from "@/lib/uploads/policy";
import { ACTIVE_STATUSES, uploadReducer, type UploadItem } from "@/lib/uploads/state";
import { sendToCloudinary, UploadError } from "@/lib/uploads/transfer";
import type { UploadedAsset, UploadSignature } from "@/lib/uploads/types";

const MAX_CONCURRENT_UPLOADS = 3;
/** A batch that finished with no failures closes itself after this long. */
const AUTO_CLOSE_MS = 2500;
/** Matches the panel's exit animation, so finished items are removed only after it has closed. */
const PANEL_EXIT_MS = 240;

/**
 * An image over its upload limit is still queued when compression may bring it under the limit.
 * Beyond this many times the limit, it is refused straight away.
 */
const COMPRESSIBLE_OVERSIZE_FACTOR = 4;

/** Videos shrink less predictably than images, so the allowance is smaller. */
const VIDEO_OVERSIZE_FACTOR = 2;

interface UploadContextValue {
  items: UploadItem[];
  /** Queues files for upload. Unsupported or oversized files are listed as failed without uploading. */
  enqueueFiles: (files: File[]) => void;
  /** Saves pasted or dropped text as a link when it is a single web address, otherwise as a note. */
  saveText: (text: string) => Promise<void>;
  /** Handles a drop or paste. Returns false when there was nothing usable. */
  intake: (data: DataTransfer) => boolean;
  cancel: (id: string) => void;
  retry: (id: string) => void;
  dismiss: (id: string) => void;
  clearFinished: () => void;
  /** Whether the upload queue panel is shown. It opens by itself when files are added. */
  queueOpen: boolean;
  setQueueOpen: (open: boolean) => void;
  /** Stops compressing an item and uploads the original file instead. */
  skipCompression: (id: string) => void;
  compressionSettings: CompressionSettings;
  /** Updates image compression for files queued from now on. Returns false when the browser could not store it. */
  setCompressionSettings: (settings: CompressionSettings) => boolean;
}

const UploadContext = createContext<UploadContextValue | null>(null);

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `upload-${Date.now()}-${idCounter}`;
}

/** Adds an extension to pasted files that have none, and lowercases the extension. */
function displayNameFor(name: string, rule: UploadRule | null): string {
  const base = name.trim() || "pasted-file";
  if (!base.includes(".") && rule) return `${base}.${rule.extensions[0]}`;
  return base.replace(/\.[^.]+$/, (extension) => extension.toLowerCase());
}

function filesFrom(data: DataTransfer): File[] {
  if (data.files.length > 0) return Array.from(data.files);
  return Array.from(data.items)
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
}

function firstLinkOrText(data: DataTransfer): string {
  const uriLine = data
    .getData("text/uri-list")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith("#"));
  return uriLine ?? data.getData("text/plain");
}

/** AbortSignal.any with a fallback for browsers released before 2024. */
function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === "function") return AbortSignal.any(signals);
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError && error.sessionExpired) {
    return "Your session ended. Sign in again, then press Retry. This file is still queued.";
  }
  if (error instanceof ApiError || error instanceof UploadError) return error.message;
  return "Something went wrong. Try again.";
}

function retryableFor(error: unknown): boolean {
  if (error instanceof ApiError || error instanceof UploadError) return error.retryable;
  return true;
}

export function UploadProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [items, dispatch] = useReducer(uploadReducer, []);
  const [queueOpen, setQueueOpen] = useState(true);
  const itemsRef = useRef(items);
  const files = useRef(new Map<string, File>());
  const rules = useRef(new Map<string, UploadRule>());
  const controllers = useRef(new Map<string, AbortController>());
  // Separate from the upload controller, so "Use original" stops only the compression step.
  const compressionControllers = useRef(new Map<string, AbortController>());
  const started = useRef(new Set<string>());

  // Compression settings are stored in this browser only.
  const compressionSettings = useSyncExternalStore(
    subscribeCompressionSettings,
    getCompressionSettings,
    getServerCompressionSettings,
  );

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // A batch that finished with no failures closes itself. A failure keeps the panel open for a retry.
  useEffect(() => {
    if (!queueOpen || items.length === 0) return;
    if (!items.every((item) => item.status === "completed" || item.status === "cancelled")) return;
    const timer = window.setTimeout(() => setQueueOpen(false), AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [queueOpen, items]);

  // Once the panel is closed and nothing is running, drop the finished items so the next open starts empty.
  useEffect(() => {
    if (queueOpen || items.length === 0) return;
    if (items.some((item) => ACTIVE_STATUSES.has(item.status) || item.status === "waiting")) return;
    const timer = window.setTimeout(() => dispatch({ type: "clearDone" }), PANEL_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [queueOpen, items]);

  // Warn before leaving the page while files are still moving.
  useEffect(() => {
    const busy = items.some((item) => ACTIVE_STATUSES.has(item.status));
    if (!busy) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [items]);

  const enqueueFiles = useCallback((list: File[]) => {
    const created: UploadItem[] = [];

    for (const original of list) {
      const id = nextId();
      const rule = findUploadRule(original.name, original.type);
      const name = displayNameFor(original.name, rule);
      const base = { id, name, size: original.size, progress: null, itemId: null, uploaded: null, compression: null };

      if (!rule) {
        created.push({
          ...base,
          status: "failed",
          error: `Not supported. Accepted types: ${supportedTypesDescription()}.`,
          retryable: false,
        });
        continue;
      }
      if (original.size === 0) {
        created.push({ ...base, status: "failed", error: "This file is empty.", retryable: false });
        continue;
      }
      const settings = getCompressionSettings();
      const sourceType = original.type || rule.mimeType;
      const mayShrink =
        (rule.kind === "image" &&
          settings.enabled &&
          isCompressibleImage(sourceType) &&
          original.size <= rule.maxBytes * COMPRESSIBLE_OVERSIZE_FACTOR) ||
        (rule.kind === "video" &&
          settings.videoEnabled &&
          isCompressibleVideo(sourceType) &&
          original.size <= Math.min(rule.maxBytes * VIDEO_OVERSIZE_FACTOR, MAX_VIDEO_COMPRESSION_INPUT_BYTES));
      if (original.size > rule.maxBytes && !mayShrink) {
        created.push({
          ...base,
          status: "failed",
          error: `Too large. ${rule.kind} uploads can be up to ${maxSizeLabel(rule)}.`,
          retryable: false,
        });
        continue;
      }

      // Rename a copy so Cloudinary sees the right extension, for example for pasted images.
      files.current.set(id, name === original.name ? original : new File([original], name, { type: original.type }));
      rules.current.set(id, rule);
      created.push({ ...base, status: "waiting", error: null, retryable: false });
    }

    if (created.length > 0) {
      // A new batch replaces the finished uploads from earlier. Failures stay until retried or removed.
      dispatch({ type: "clearDone" });
      dispatch({ type: "add", items: created });
      setQueueOpen(true);
    }
  }, []);

  const saveText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const isLink = isLikelyUrlText(trimmed);
      try {
        await apiRequest<{ item: FileItem }>("/api/files", {
          method: "POST",
          body: isLink ? { type: "link", url: trimmed } : { type: "note", text: trimmed },
        });
        toast.show(isLink ? "Link saved." : "Note saved.");
        router.refresh();
      } catch (error) {
        toast.show(messageFor(error), "error");
      }
    },
    [router, toast],
  );

  const intake = useCallback(
    (data: DataTransfer) => {
      const dropped = filesFrom(data);
      if (dropped.length > 0) {
        enqueueFiles(dropped);
        return true;
      }
      const text = firstLinkOrText(data);
      if (text.trim()) {
        void saveText(text);
        return true;
      }
      return false;
    },
    [enqueueFiles, saveText],
  );

  /**
   * Runs the compression step. "Use original" aborts only the compression controller; the upload
   * then continues with the original file. Cancelling the upload aborts both.
   */
  const compressForUpload = useCallback(
    async (id: string, file: File, rule: UploadRule, uploadSignal: AbortSignal): Promise<PreparedFile> => {
      const controller = new AbortController();
      compressionControllers.current.set(id, controller);
      const signal = anySignal([uploadSignal, controller.signal]);
      const settings = getCompressionSettings();
      try {
        if (rule.kind === "video") {
          const sourceType = isCompressibleVideo(file.type) ? file.type : rule.mimeType;
          return await prepareVideoForUpload(file, sourceType, settings, signal, (progress) =>
            dispatch({ type: "progress", id, progress }),
          );
        }
        const sourceType = isCompressibleImage(file.type) ? file.type : rule.mimeType;
        return await prepareImageForUpload(file, sourceType, settings, signal);
      } catch (error) {
        if (controller.signal.aborted && !uploadSignal.aborted) return keepOriginal(file, "skipped");
        throw error;
      } finally {
        compressionControllers.current.delete(id);
      }
    },
    [],
  );

  const runUpload = useCallback(
    async (item: UploadItem) => {
      const controller = new AbortController();
      controllers.current.set(item.id, controller);
      const { signal } = controller;

      try {
        let uploaded: UploadedAsset | null = item.uploaded;
        let compression = item.compression;

        if (!uploaded) {
          let file = files.current.get(item.id);
          const rule = rules.current.get(item.id);
          if (!file || !rule) throw new UploadError("This file is no longer available. Choose it again.", false);

          // Images and videos are compressed once. A retry reuses the processed file kept in the map.
          const compressible =
            rule.kind === "image" || (rule.kind === "video" && getCompressionSettings().videoEnabled);
          if (compressible && !item.compression) {
            dispatch({ type: "status", id: item.id, status: "compressing" });
            const prepared = await compressForUpload(item.id, file, rule, signal);
            file = prepared.file;
            files.current.set(item.id, file);
            compression = prepared.summary;
            dispatch({ type: "compressed", id: item.id, compression });
          }

          if (file.size > rule.maxBytes) {
            const detail = compression?.outcome === "compressed" ? " even after compression" : "";
            throw new UploadError(
              `Too large${detail}. ${rule.kind} uploads can be up to ${maxSizeLabel(rule)}. Reduce it and try again.`,
              false,
            );
          }

          dispatch({ type: "status", id: item.id, status: "preparing" });
          const signature = await apiRequest<UploadSignature>("/api/uploads", {
            method: "POST",
            body: { name: file.name, size: file.size },
          });

          dispatch({ type: "status", id: item.id, status: "uploading" });
          uploaded = await sendToCloudinary({
            signature,
            file,
            signal,
            onProgress: (progress) => dispatch({ type: "progress", id: item.id, progress }),
          });
          dispatch({ type: "uploaded", id: item.id, uploaded });
        } else {
          // The file is already in Cloudinary, so only the save step is retried.
          dispatch({ type: "status", id: item.id, status: "saving" });
        }

        const { item: saved } = await apiRequest<{ item: FileItem }>("/api/uploads/complete", {
          method: "POST",
          body: {
            publicId: uploaded.publicId,
            assetId: uploaded.assetId,
            resourceType: uploaded.resourceType,
            ...(compression?.outcome === "compressed"
              ? { compression: { originalBytes: compression.originalBytes, originalName: item.name } }
              : {}),
          },
        });
        files.current.delete(item.id);
        rules.current.delete(item.id);
        dispatch({ type: "completed", id: item.id, itemId: saved.id });
        router.refresh();
      } catch (error) {
        if (signal.aborted) return; // Cancelled on purpose. The cancel action already updated the item.
        dispatch({ type: "failed", id: item.id, error: messageFor(error), retryable: retryableFor(error) });
      } finally {
        controllers.current.delete(item.id);
      }
    },
    [router, compressForUpload],
  );

  // Start waiting items while there are free slots.
  useEffect(() => {
    const active = items.filter((item) => ACTIVE_STATUSES.has(item.status)).length;
    let slots = MAX_CONCURRENT_UPLOADS - active;
    for (const item of items) {
      if (slots <= 0) break;
      if (item.status === "waiting" && !started.current.has(item.id)) {
        started.current.add(item.id);
        slots -= 1;
        void runUpload(item);
      }
    }
  }, [items, runUpload]);

  const cancel = useCallback(
    (id: string) => {
      const item = itemsRef.current.find((candidate) => candidate.id === id);
      if (!item || item.status === "completed" || item.status === "failed" || item.status === "cancelled") return;

      controllers.current.get(id)?.abort();
      files.current.delete(id);
      rules.current.delete(id);
      dispatch({ type: "cancel", id });

      // The file may already be in Cloudinary. Remove it so cancelled uploads leave nothing behind.
      if (item.uploaded) {
        apiRequest("/api/uploads/discard", { method: "POST", body: { publicId: item.uploaded.publicId } }).catch(() =>
          toast.show("The upload was cancelled, but it couldn't be removed from storage.", "error"),
        );
      }
    },
    [toast],
  );

  const skipCompression = useCallback((id: string) => {
    compressionControllers.current.get(id)?.abort();
  }, []);

  const retry = useCallback((id: string) => {
    started.current.delete(id);
    dispatch({ type: "retry", id });
  }, []);

  const dismiss = useCallback((id: string) => {
    files.current.delete(id);
    rules.current.delete(id);
    dispatch({ type: "dismiss", id });
  }, []);

  const clearFinished = useCallback(() => {
    dispatch({ type: "clearFinished" });
  }, []);

  const value = useMemo<UploadContextValue>(
    () => ({
      items,
      enqueueFiles,
      saveText,
      intake,
      cancel,
      retry,
      dismiss,
      clearFinished,
      queueOpen,
      setQueueOpen,
      skipCompression,
      compressionSettings,
      setCompressionSettings: updateCompressionSettings,
    }),
    [
      items,
      enqueueFiles,
      saveText,
      intake,
      cancel,
      retry,
      dismiss,
      clearFinished,
      queueOpen,
      skipCompression,
      compressionSettings,
    ],
  );

  return <UploadContext value={value}>{children}</UploadContext>;
}

export function useUploads(): UploadContextValue {
  const context = useContext(UploadContext);
  if (!context) throw new Error("useUploads must be used inside UploadProvider");
  return context;
}
