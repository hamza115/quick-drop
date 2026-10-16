import { isEncodeNeeded, planEncode, type OutputType } from "@/lib/compression/plan";
import type { CompressionSettings } from "@/lib/compression/settings";

// Browser-only. Runs inside the image worker, or on the main thread when the browser has no OffscreenCanvas.

export interface EncodeResult {
  blob: Blob;
  type: OutputType;
  width: number;
  height: number;
  resized: boolean;
}

/** Thrown when this browser cannot decode or encode the image. The caller uploads the original. */
export class EncodeUnsupportedError extends Error {
  constructor(message = "This browser can't process this image.") {
    super(message);
    this.name = "EncodeUnsupportedError";
  }
}

/** Thrown when the image is already as small as it can usefully be (an unresized PNG). */
export class EncodeNotNeededError extends Error {
  constructor() {
    super("No compression needed.");
    this.name = "EncodeNotNeededError";
  }
}

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;

function createCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  throw new EncodeUnsupportedError();
}

function toBlob(canvas: AnyCanvas, type: string, quality: number): Promise<Blob> {
  if ("convertToBlob" in canvas) return canvas.convertToBlob({ type, quality });
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new EncodeUnsupportedError())), type, quality);
  });
}

/**
 * Decodes, resizes (never upscales) and re-encodes one image. EXIF orientation is applied while
 * decoding, so the pixels come out upright; the EXIF data itself is not copied to the output.
 */
export async function encodeImage(
  input: Blob,
  inputType: string,
  settings: Pick<CompressionSettings, "preset" | "maxDimension">,
): Promise<EncodeResult> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(input, { imageOrientation: "from-image" });
  } catch {
    throw new EncodeUnsupportedError("This image couldn't be read for compression.");
  }

  try {
    const plan = planEncode({ type: inputType, width: bitmap.width, height: bitmap.height }, settings);
    if (!isEncodeNeeded(plan)) throw new EncodeNotNeededError();
    const canvas = createCanvas(plan.width, plan.height);
    const context = "convertToBlob" in canvas ? canvas.getContext("2d") : canvas.getContext("2d");
    if (!context) throw new EncodeUnsupportedError();

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, plan.width, plan.height);

    let blob = await toBlob(canvas, plan.type, plan.quality);
    let type: OutputType = plan.type;

    // Browsers that cannot encode WebP (for WebP input) silently return PNG. PNG is lossless and keeps
    // transparency, so it is only worth keeping when the image was resized; the caller compares sizes.
    if (blob.type !== plan.type) {
      if (!plan.resized) throw new EncodeUnsupportedError("This browser can't compress this image type.");
      blob = await toBlob(canvas, "image/png", 1);
      type = "image/png";
      if (blob.type !== "image/png") throw new EncodeUnsupportedError();
    }

    return { blob, type, width: plan.width, height: plan.height, resized: plan.resized };
  } finally {
    bitmap.close();
  }
}
