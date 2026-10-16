import { z } from "zod";

// Client-safe. Compression runs in the browser, so these settings live in the browser too.
// The Settings screen (Phase 5) edits the same values through the same helpers.

export const COMPRESSION_PRESETS = ["high", "balanced", "small"] as const;
export type CompressionPreset = (typeof COMPRESSION_PRESETS)[number];

export interface PresetDefinition {
  label: string;
  description: string;
  /** Encoder quality for lossy output, 0 to 1. */
  quality: number;
}

export const PRESETS: Record<CompressionPreset, PresetDefinition> = {
  high: { label: "High quality", description: "Small savings. Best for detailed screenshots.", quality: 0.92 },
  balanced: { label: "Balanced", description: "Good savings. Screenshot text stays sharp.", quality: 0.85 },
  small: { label: "Smallest", description: "Largest savings. Fine detail may soften.", quality: 0.72 },
};

/** Longest-edge limits offered in settings. 0 means "keep the original dimensions". */
export const MAX_DIMENSION_OPTIONS = [0, 3840, 2560, 1920, 1280] as const;

/** Video resolution caps, by the shorter edge (720 means 1280×720 landscape or 720×1280 portrait). */
export const VIDEO_RESOLUTION_OPTIONS = [480, 720, 1080] as const;

export const compressionSettingsSchema = z.object({
  enabled: z.boolean(),
  preset: z.enum(COMPRESSION_PRESETS),
  maxDimension: z.literal(MAX_DIMENSION_OPTIONS),
  // Added later. Defaults keep settings saved by earlier versions valid.
  /** Video compression is opt-in: it is slow and memory-hungry in a browser. */
  videoEnabled: z.boolean().default(false),
  videoResolution: z.literal(VIDEO_RESOLUTION_OPTIONS).default(720),
});

export type CompressionSettings = z.infer<typeof compressionSettingsSchema>;

export const DEFAULT_COMPRESSION_SETTINGS: CompressionSettings = {
  enabled: true,
  preset: "balanced",
  maxDimension: 3840,
  videoEnabled: false,
  videoResolution: 720,
};

export function videoResolutionLabel(value: number): string {
  return `${value}p`;
}

export function maxDimensionLabel(value: number): string {
  return value === 0 ? "Original size" : `${value} px longest edge`;
}

const STORAGE_KEY = "quickdrop.compression.v1";

/** Reads saved settings. Missing, blocked or invalid storage falls back to the defaults. */
export function loadCompressionSettings(): CompressionSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COMPRESSION_SETTINGS;
    const parsed = compressionSettingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_COMPRESSION_SETTINGS;
  } catch {
    return DEFAULT_COMPRESSION_SETTINGS;
  }
}

/** Saves settings. Returns false when the browser blocks storage; the values then last for this visit only. */
export function saveCompressionSettings(settings: CompressionSettings): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

/*
 * A small store for useSyncExternalStore. The server snapshot is the defaults, so server-rendered
 * markup matches the first client render; React then switches to the saved values.
 */

let current: CompressionSettings | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  current = loadCompressionSettings();
  notify();
}

export function getCompressionSettings(): CompressionSettings {
  current ??= loadCompressionSettings();
  return current;
}

export function getServerCompressionSettings(): CompressionSettings {
  return DEFAULT_COMPRESSION_SETTINGS;
}

/** Subscribes to changes, including changes made in another tab. */
export function subscribeCompressionSettings(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

/** Applies new settings straight away and stores them. Returns false when storing failed. */
export function updateCompressionSettings(settings: CompressionSettings): boolean {
  current = settings;
  const saved = saveCompressionSettings(settings);
  notify();
  return saved;
}
