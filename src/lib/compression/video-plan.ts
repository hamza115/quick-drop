import type { CompressionPreset } from "@/lib/compression/settings";

// Pure rules for browser video compression, so they can be unit tested.

/** Input types worth trying. The browser's FFmpeg build may still fail on some codecs; the original is then kept. */
const VIDEO_INPUT_TYPES: ReadonlySet<string> = new Set(["video/mp4", "video/webm", "video/quicktime"]);

/** H.264 quality per preset (constant rate factor: lower is better and larger). */
export const VIDEO_CRF: Record<CompressionPreset, number> = { high: 23, balanced: 27, small: 31 };

/** Audio bitrate per preset. */
export const AUDIO_BITRATE: Record<CompressionPreset, string> = { high: "128k", balanced: "96k", small: "64k" };

/**
 * Inputs above this size are not compressed in the browser: the single-threaded FFmpeg build has a
 * limited memory space and very long run times. The original is uploaded if it is within the limit.
 */
export const MAX_VIDEO_COMPRESSION_INPUT_BYTES = 250 * 1024 * 1024;

/** Devices reporting less memory than this (navigator.deviceMemory, in GB) skip video compression. */
export const MIN_DEVICE_MEMORY_GB = 4;

export function isCompressibleVideo(mimeType: string): boolean {
  return VIDEO_INPUT_TYPES.has(mimeType.toLowerCase());
}

/**
 * FFmpeg scale filter that caps the shorter edge at maxShortEdge, never upscales, keeps the aspect
 * ratio and keeps both dimensions even (needed for H.264 4:2:0). FFmpeg auto-rotates phone videos
 * before this filter runs, so iw and ih are the displayed size. The quotes protect the commas from
 * the filter-graph parser; arguments are passed without a shell.
 */
export function scaleFilter(maxShortEdge: number): string {
  const cap = Math.max(2, Math.floor(maxShortEdge / 2) * 2);
  return (
    `scale=w='if(lte(iw,ih),trunc(min(iw,${cap})/2)*2,-2)'` +
    `:h='if(lte(iw,ih),-2,trunc(min(ih,${cap})/2)*2)'`
  );
}

/** FFmpeg arguments: H.264 + AAC in MP4, web-friendly (moov atom first), metadata stripped. */
export function buildVideoArgs(options: {
  input: string;
  output: string;
  maxShortEdge: number;
  preset: CompressionPreset;
}): string[] {
  return [
    "-i", options.input,
    "-map", "0:v:0",
    "-map", "0:a:0?",
    "-vf", scaleFilter(options.maxShortEdge),
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", String(VIDEO_CRF[options.preset]),
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", AUDIO_BITRATE[options.preset],
    "-map_metadata", "-1",
    "-movflags", "+faststart",
    options.output,
  ];
}

/** Clamps FFmpeg's progress (which can be negative or above 1 early on) to 0..1, or null when unknown. */
export function normaliseProgress(progress: number): number | null {
  if (!Number.isFinite(progress) || progress < 0) return null;
  return Math.min(1, progress);
}
