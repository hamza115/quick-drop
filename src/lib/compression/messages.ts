import type { EncodeResult } from "@/lib/compression/encode";
import type { CompressionSettings } from "@/lib/compression/settings";

/** Message sent to the image worker. */
export interface WorkerRequest {
  file: Blob;
  type: string;
  settings: Pick<CompressionSettings, "preset" | "maxDimension">;
}

/** Message sent back by the image worker. */
export type WorkerResponse =
  | ({ ok: true } & EncodeResult)
  | { ok: false; unsupported: boolean; notNeeded: boolean; message: string };
