import { encodeImage, EncodeNotNeededError, EncodeUnsupportedError, type EncodeResult } from "@/lib/compression/encode";
import type { WorkerRequest, WorkerResponse } from "@/lib/compression/messages";
import { isCompressibleImage, renameForType, shouldKeepProcessed } from "@/lib/compression/plan";
import type { CompressionSettings } from "@/lib/compression/settings";

// Browser-only entry point used by the upload queue.

/** Gives up and uploads the original if a single image takes longer than this. */
const COMPRESSION_TIMEOUT_MS = 60_000;

/**
 * Why the original file was uploaded instead of a processed one.
 * skipped: the user chose "Use original". device: the device reports too little memory.
 * too-large: too big to process in the browser. not-needed: a PNG already within the size limit.
 */
export type KeptOriginalReason =
  | "disabled"
  | "unsupported"
  | "larger"
  | "failed"
  | "skipped"
  | "device"
  | "too-large"
  | "not-needed";

export interface CompressionSummary {
  outcome: "compressed" | "original";
  reason: KeptOriginalReason | null;
  originalBytes: number;
  processedBytes: number;
  /** Set when the image was resized. */
  width: number | null;
  height: number | null;
}

export interface PreparedFile {
  file: File;
  summary: CompressionSummary;
}

export function abortError(): DOMException {
  return new DOMException("Compression cancelled.", "AbortError");
}

function canUseWorker(): boolean {
  return typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined";
}

function encodeInWorker(request: WorkerRequest, signal: AbortSignal): Promise<EncodeResult> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }

    const worker = new Worker(new URL("./image.worker.ts", import.meta.url), { type: "module" });
    const timer = setTimeout(() => finish(() => reject(new Error("Compression took too long."))), COMPRESSION_TIMEOUT_MS);

    function finish(settle: () => void) {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      worker.terminate();
      settle();
    }
    function onAbort() {
      finish(() => reject(abortError()));
    }

    signal.addEventListener("abort", onAbort, { once: true });
    worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      finish(() => {
        if (response.ok) {
          const { blob, type, width, height, resized } = response;
          resolve({ blob, type, width, height, resized });
        } else {
          reject(
            response.notNeeded
              ? new EncodeNotNeededError()
              : response.unsupported
                ? new EncodeUnsupportedError(response.message)
                : new Error(response.message),
          );
        }
      });
    });
    worker.addEventListener("error", () => finish(() => reject(new Error("Compression failed."))));
    worker.postMessage(request);
  });
}

async function encodeOnMainThread(request: WorkerRequest, signal: AbortSignal): Promise<EncodeResult> {
  if (signal.aborted) throw abortError();
  const result = await encodeImage(request.file, request.type, request.settings);
  if (signal.aborted) throw abortError();
  return result;
}

export function keepOriginal(file: File, reason: KeptOriginalReason): PreparedFile {
  return {
    file,
    summary: { outcome: "original", reason, originalBytes: file.size, processedBytes: file.size, width: null, height: null },
  };
}

/**
 * Compresses a supported image before upload. Always resolves with something uploadable:
 * the processed file when it is smaller, otherwise the original with the reason it was kept.
 * Rejects only with an AbortError when the signal is aborted.
 */
export async function prepareImageForUpload(
  file: File,
  mimeType: string,
  settings: CompressionSettings,
  signal: AbortSignal,
): Promise<PreparedFile> {
  if (!settings.enabled) return keepOriginal(file, "disabled");
  if (!isCompressibleImage(mimeType)) return keepOriginal(file, "unsupported");

  const request: WorkerRequest = {
    file,
    type: mimeType,
    settings: { preset: settings.preset, maxDimension: settings.maxDimension },
  };

  let result: EncodeResult;
  try {
    result = canUseWorker() ? await encodeInWorker(request, signal) : await encodeOnMainThread(request, signal);
  } catch (error) {
    if (signal.aborted) throw abortError();
    if (error instanceof EncodeNotNeededError) return keepOriginal(file, "not-needed");
    return keepOriginal(file, error instanceof EncodeUnsupportedError ? "unsupported" : "failed");
  }

  if (!shouldKeepProcessed(file.size, result.blob.size, result.resized)) return keepOriginal(file, "larger");

  const processed = new File([result.blob], renameForType(file.name, result.type), {
    type: result.type,
    lastModified: file.lastModified,
  });
  return {
    file: processed,
    summary: {
      outcome: "compressed",
      reason: null,
      originalBytes: file.size,
      processedBytes: processed.size,
      width: result.resized ? result.width : null,
      height: result.resized ? result.height : null,
    },
  };
}
