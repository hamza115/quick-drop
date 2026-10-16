import { PRESETS, type CompressionSettings } from "@/lib/compression/settings";

// Pure rules shared by the worker and the main-thread fallback, so they can be unit tested.

/** Input types the browser can decode and re-encode safely. GIF is left alone because it may be animated. */
const COMPRESSIBLE_TYPES: ReadonlySet<string> = new Set(["image/jpeg", "image/png", "image/webp"]);

export type OutputType = "image/jpeg" | "image/webp" | "image/png";

export const OUTPUT_EXTENSIONS: Record<OutputType, string> = {
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/png": "png",
};

export function isCompressibleImage(mimeType: string): boolean {
  return COMPRESSIBLE_TYPES.has(mimeType.toLowerCase());
}

/** Scales the longest edge down to the limit. Never upscales. A limit of 0 keeps the size. */
export function targetDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number; resized: boolean } {
  const longest = Math.max(width, height);
  if (maxDimension <= 0 || longest <= maxDimension) return { width, height, resized: false };
  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    resized: true,
  };
}

/**
 * Chooses the output format: every image keeps its own format. JPEG stays JPEG, WebP stays WebP,
 * and PNG (most screenshots) stays PNG, so downloads open everywhere and screenshots stay lossless.
 * PNG output is lossless, so a PNG only gets smaller by being resized.
 */
export function outputTypeFor(inputType: string): OutputType {
  const type = inputType.toLowerCase();
  if (type === "image/jpeg") return "image/jpeg";
  if (type === "image/png") return "image/png";
  return "image/webp";
}

/** True when re-encoding can't help: lossless PNG at the same size never beats the original. */
export function isEncodeNeeded(plan: Pick<EncodePlan, "type" | "resized">): boolean {
  return plan.resized || plan.type !== "image/png";
}

export interface EncodePlan {
  width: number;
  height: number;
  resized: boolean;
  type: OutputType;
  quality: number;
}

export function planEncode(
  input: { type: string; width: number; height: number },
  settings: Pick<CompressionSettings, "preset" | "maxDimension">,
): EncodePlan {
  const size = targetDimensions(input.width, input.height, settings.maxDimension);
  return { ...size, type: outputTypeFor(input.type), quality: PRESETS[settings.preset].quality };
}

/** Swaps the extension to match the encoded format, for example "shot.png" → "shot.webp". */
export function renameForType(name: string, type: OutputType): string {
  return renameWithExtension(name, OUTPUT_EXTENSIONS[type]);
}

/** Replaces or adds an extension, for example ("clip.mov", "mp4") → "clip.mp4". */
export function renameWithExtension(name: string, extension: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base || "file"}.${extension}`;
}

/** Whole-number percentage saved, for example 1000 → 400 gives 60. Never negative. */
export function percentSaved(originalBytes: number, processedBytes: number): number {
  if (originalBytes <= 0 || processedBytes >= originalBytes) return 0;
  return Math.round(((originalBytes - processedBytes) / originalBytes) * 100);
}

/**
 * Keeps the processed file only when it is meaningfully smaller (at least 2% and 1 KB),
 * or when resizing was needed. Otherwise the original is the better upload.
 */
export function shouldKeepProcessed(originalBytes: number, processedBytes: number, resized: boolean): boolean {
  if (processedBytes <= 0) return false;
  if (processedBytes >= originalBytes) return false;
  if (resized) return true;
  const saved = originalBytes - processedBytes;
  return saved >= 1024 && saved / originalBytes >= 0.02;
}
