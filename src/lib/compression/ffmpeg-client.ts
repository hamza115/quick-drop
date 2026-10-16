// Browser-only. A minimal client for the FFmpeg.wasm worker served from /ffmpeg/worker.js.
//
// Why not the @ffmpeg/ffmpeg FFmpeg class: it creates its worker with
// `new Worker(new URL(variable, import.meta.url))`, which Turbopack tries to resolve at build time
// and fails ("Module not found: Can't resolve <dynamic>"). This client speaks the same small message
// protocol ({ id, type, data } in, the same id or an ERROR back) and creates the worker from a
// runtime URL, so nothing about FFmpeg is bundled. The worker and core files are copied to
// public/ffmpeg by scripts/copy-ffmpeg.mjs from the pinned @ffmpeg packages.

type MessageType = "LOAD" | "EXEC" | "READ_FILE" | "CREATE_DIR" | "MOUNT" | "UNMOUNT" | "DELETE_FILE";

interface WorkerReply {
  id?: number;
  type: MessageType | "ERROR" | "PROGRESS" | "LOG";
  data: unknown;
}

export interface FFmpegProgress {
  /** 0 to 1 when FFmpeg knows the duration; can be negative or above 1 early on. */
  progress: number;
  time: number;
}

const ASSET_BASE = "/ffmpeg/";

function assetUrl(name: string): string {
  return new URL(`${ASSET_BASE}${name}`, window.location.origin).href;
}

export class FFmpegTerminatedError extends Error {
  constructor() {
    super("FFmpeg was stopped.");
    this.name = "FFmpegTerminatedError";
  }
}

export class FFmpegWorkerClient {
  #worker: Worker | null;
  #nextId = 0;
  #pending = new Map<number, { resolve: (data: unknown) => void; reject: (error: Error) => void }>();
  #onProgress: ((event: FFmpegProgress) => void) | null = null;

  constructor() {
    const workerUrl = assetUrl("worker.js");
    // A runtime URL (not `new URL(..., import.meta.url)`), so the bundler leaves it alone.
    this.#worker = new Worker(/* turbopackIgnore: true */ /* webpackIgnore: true */ workerUrl, { type: "module" });
    this.#worker.onmessage = ({ data }: MessageEvent<WorkerReply>) => this.#handle(data);
    this.#worker.onerror = () => this.#rejectAll(new Error("The video compressor stopped unexpectedly."));
  }

  onProgress(callback: ((event: FFmpegProgress) => void) | null): void {
    this.#onProgress = callback;
  }

  #handle(reply: WorkerReply): void {
    if (reply.type === "PROGRESS") {
      this.#onProgress?.(reply.data as FFmpegProgress);
      return;
    }
    if (reply.type === "LOG" || reply.id === undefined) return;
    const pending = this.#pending.get(reply.id);
    if (!pending) return;
    this.#pending.delete(reply.id);
    if (reply.type === "ERROR") pending.reject(new Error(String(reply.data)));
    else pending.resolve(reply.data);
  }

  #rejectAll(error: Error): void {
    for (const pending of this.#pending.values()) pending.reject(error);
    this.#pending.clear();
  }

  #send<T>(type: MessageType, data: unknown, signal?: AbortSignal): Promise<T> {
    const worker = this.#worker;
    if (!worker) return Promise.reject(new FFmpegTerminatedError());
    if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));

    return new Promise<T>((resolve, reject) => {
      this.#nextId += 1;
      const id = this.#nextId;
      this.#pending.set(id, { resolve: (value) => resolve(value as T), reject });
      signal?.addEventListener(
        "abort",
        () => {
          if (this.#pending.delete(id)) reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );
      worker.postMessage({ id, type, data });
    });
  }

  /** Loads the FFmpeg core (about 31 MB, cached by the browser after the first time). */
  load(signal?: AbortSignal): Promise<boolean> {
    return this.#send<boolean>(
      "LOAD",
      { coreURL: assetUrl("ffmpeg-core.js"), wasmURL: assetUrl("ffmpeg-core.wasm") },
      signal,
    );
  }

  createDir(path: string, signal?: AbortSignal): Promise<boolean> {
    return this.#send<boolean>("CREATE_DIR", { path }, signal);
  }

  /** WORKERFS reads the files on demand instead of copying them into FFmpeg's memory. */
  mountFiles(files: File[], mountPoint: string, signal?: AbortSignal): Promise<boolean> {
    return this.#send<boolean>("MOUNT", { fsType: "WORKERFS", options: { files }, mountPoint }, signal);
  }

  unmount(mountPoint: string, signal?: AbortSignal): Promise<boolean> {
    return this.#send<boolean>("UNMOUNT", { mountPoint }, signal);
  }

  deleteFile(path: string, signal?: AbortSignal): Promise<boolean> {
    return this.#send<boolean>("DELETE_FILE", { path }, signal);
  }

  /** False once the worker has been stopped. A stopped client cannot be restarted; create a new one. */
  get alive(): boolean {
    return this.#worker !== null;
  }

  /** Runs FFmpeg. Resolves with its exit code (0 = success). */
  exec(args: string[], signal?: AbortSignal): Promise<number> {
    return this.#send<number>("EXEC", { args: ["-nostdin", "-y", ...args], timeout: -1 }, signal);
  }

  readFile(path: string, signal?: AbortSignal): Promise<Uint8Array> {
    return this.#send<Uint8Array>("READ_FILE", { path, encoding: "binary" }, signal);
  }

  /** Stops the worker immediately and frees all of FFmpeg's memory. Safe to call more than once. */
  terminate(): void {
    this.#worker?.terminate();
    this.#worker = null;
    this.#rejectAll(new FFmpegTerminatedError());
  }
}
