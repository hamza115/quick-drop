import { abortError, keepOriginal, type PreparedFile } from "@/lib/compression/compress";
import { FFmpegWorkerClient } from "@/lib/compression/ffmpeg-client";
import { renameWithExtension, shouldKeepProcessed } from "@/lib/compression/plan";
import type { CompressionSettings } from "@/lib/compression/settings";
import {
  buildVideoArgs,
  isCompressibleVideo,
  MAX_VIDEO_COMPRESSION_INPUT_BYTES,
  MIN_DEVICE_MEMORY_GB,
  normaliseProgress,
} from "@/lib/compression/video-plan";

// Browser-only. Compresses videos with FFmpeg.wasm (single-threaded build, so no cross-origin
// isolation headers are needed). FFmpeg runs in its own worker; the main thread stays responsive.
// The worker and core are served unbundled from /ffmpeg (copied there by scripts/copy-ffmpeg.mjs).

const INPUT_DIR = "/input";
const OUTPUT_PATH = "/output.mp4";

/** An encode that reports no progress for this long is stopped, so it cannot block later videos. */
const STALL_TIMEOUT_MS = 3 * 60_000;
/** Hard limit for one video, including loading the encoder. */
const MAX_ENCODE_MS = 20 * 60_000;
/** The encoder stays loaded this long after the last video, so a batch of videos reuses it. */
const IDLE_SHUTDOWN_MS = 60_000;

interface Engine {
  client: FFmpegWorkerClient;
  /** The core is loaded once per worker: loading it again costs about 31 MB of download and compile. */
  loaded: boolean;
  inputDirReady: boolean;
  /** True while the input file is mounted. Only then does it need unmounting. */
  mounted: boolean;
}

/** One encoder shared by all videos. Only one video runs at a time (see runExclusive). */
let engine: Engine | null = null;
let idleTimer: number | undefined;

/** Only one video is compressed at a time: each FFmpeg instance can use hundreds of MB of memory. */
let queue: Promise<unknown> = Promise.resolve();

function runExclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/** Null when this browser can try video compression, otherwise why it cannot. */
export function videoCompressionBlocker(): "unsupported" | "device" | null {
  if (typeof WebAssembly === "undefined" || typeof Worker === "undefined") return "unsupported";
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (memory !== undefined && memory < MIN_DEVICE_MEMORY_GB) return "device";
  return null;
}

function cancelIdleStop(): void {
  if (idleTimer !== undefined) window.clearTimeout(idleTimer);
  idleTimer = undefined;
}

/** Stops the encoder and frees its memory. The next video starts a fresh one. Safe to call anytime. */
function stopEngine(): void {
  cancelIdleStop();
  engine?.client.terminate();
  engine = null;
}

function scheduleIdleStop(): void {
  cancelIdleStop();
  idleTimer = window.setTimeout(stopEngine, IDLE_SHUTDOWN_MS);
}

function getEngine(): Engine {
  cancelIdleStop();
  if (!engine || !engine.client.alive) {
    engine = { client: new FFmpegWorkerClient(), loaded: false, inputDirReady: false, mounted: false };
  }
  return engine;
}

/** Removes this video from the encoder so the next one starts clean. If that fails, the encoder restarts. */
async function releaseVideo(current: Engine): Promise<void> {
  try {
    if (current.mounted) {
      await current.client.unmount(INPUT_DIR);
      current.mounted = false;
    }
    // The output may not exist (for example after a failure). That is fine: the next run overwrites it.
    await current.client.deleteFile(OUTPUT_PATH).catch(() => undefined);
  } catch {
    stopEngine();
  }
}

async function compressVideo(
  file: File,
  settings: CompressionSettings,
  signal: AbortSignal,
  onProgress: (progress: number | null) => void,
): Promise<PreparedFile> {
  if (signal.aborted) throw abortError();

  const current = getEngine();
  const { client } = current;

  // Watchdog: stopping the encoder ends whichever step is running. The catch below then keeps the original.
  let stallTimer: number | undefined;
  const armStallTimer = () => {
    if (stallTimer !== undefined) window.clearTimeout(stallTimer);
    stallTimer = window.setTimeout(stopEngine, STALL_TIMEOUT_MS);
  };
  const hardLimit = window.setTimeout(stopEngine, MAX_ENCODE_MS);
  const onAbort = () => stopEngine();
  signal.addEventListener("abort", onAbort, { once: true });

  client.onProgress(({ progress }) => {
    armStallTimer();
    onProgress(normaliseProgress(progress));
  });

  try {
    if (!current.loaded) {
      await client.load(signal);
      current.loaded = true;
    }
    if (!current.inputDirReady) {
      await client.createDir(INPUT_DIR, signal);
      current.inputDirReady = true;
    }

    // WORKERFS reads the file on demand instead of copying it into FFmpeg's memory.
    // Marked before the call: a mount that fails halfway must still be unmounted during cleanup.
    current.mounted = true;
    await client.mountFiles([file], INPUT_DIR, signal);

    armStallTimer(); // Only the encode itself is judged for stalls, not the one-off load above.
    const exitCode = await client.exec(
      buildVideoArgs({
        input: `${INPUT_DIR}/${file.name}`,
        output: OUTPUT_PATH,
        maxShortEdge: settings.videoResolution,
        preset: settings.preset,
      }),
      signal,
    );
    if (exitCode !== 0) return keepOriginal(file, "failed");

    const data = await client.readFile(OUTPUT_PATH, signal);
    if (!(data instanceof Uint8Array) || data.byteLength === 0) return keepOriginal(file, "failed");

    if (!shouldKeepProcessed(file.size, data.byteLength, false)) return keepOriginal(file, "larger");

    // The worker already gave us a fresh copy of the bytes, so wrap it directly instead of copying again.
    const processed = new File([data as BlobPart], renameWithExtension(file.name, "mp4"), {
      type: "video/mp4",
      lastModified: file.lastModified,
    });
    return {
      file: processed,
      summary: {
        outcome: "compressed",
        reason: null,
        originalBytes: file.size,
        processedBytes: processed.size,
        width: null,
        height: null,
      },
    };
  } catch {
    if (signal.aborted) throw abortError();
    return keepOriginal(file, "failed");
  } finally {
    window.clearTimeout(hardLimit);
    if (stallTimer !== undefined) window.clearTimeout(stallTimer);
    signal.removeEventListener("abort", onAbort);
    if (engine === current) {
      await releaseVideo(current);
    }
    if (engine === current) scheduleIdleStop();
  }
}

/**
 * Compresses a video before upload when the user opted in. Always resolves with something
 * uploadable; the original is kept whenever compression is off, unsupported, fails, or doesn't help.
 * Rejects only with an AbortError when the signal is aborted.
 */
export async function prepareVideoForUpload(
  file: File,
  mimeType: string,
  settings: CompressionSettings,
  signal: AbortSignal,
  onProgress: (progress: number | null) => void,
): Promise<PreparedFile> {
  if (!settings.videoEnabled) return keepOriginal(file, "disabled");
  if (!isCompressibleVideo(mimeType)) return keepOriginal(file, "unsupported");
  if (file.size > MAX_VIDEO_COMPRESSION_INPUT_BYTES) return keepOriginal(file, "too-large");
  const blocker = videoCompressionBlocker();
  if (blocker) return keepOriginal(file, blocker);

  return runExclusive(() => compressVideo(file, settings, signal, onProgress));
}
