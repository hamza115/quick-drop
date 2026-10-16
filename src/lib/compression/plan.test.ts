import { describe, expect, it } from "vitest";
import {
  isCompressibleImage,
  isEncodeNeeded,
  outputTypeFor,
  percentSaved,
  planEncode,
  renameForType,
  shouldKeepProcessed,
  targetDimensions,
} from "@/lib/compression/plan";
import { compressionSettingsSchema, DEFAULT_COMPRESSION_SETTINGS, PRESETS } from "@/lib/compression/settings";

describe("targetDimensions", () => {
  it("never upscales", () => {
    expect(targetDimensions(800, 600, 3840)).toEqual({ width: 800, height: 600, resized: false });
  });

  it("keeps the size when the limit is 0", () => {
    expect(targetDimensions(8000, 6000, 0)).toEqual({ width: 8000, height: 6000, resized: false });
  });

  it("scales the longest edge down and keeps the aspect ratio", () => {
    expect(targetDimensions(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500, resized: true });
    expect(targetDimensions(1170, 2532, 1280)).toEqual({ width: 591, height: 1280, resized: true });
  });

  it("never returns a zero dimension", () => {
    expect(targetDimensions(10000, 1, 1280)).toMatchObject({ width: 1280, height: 1 });
  });
});

describe("output format", () => {
  it("keeps photos as JPEG", () => {
    expect(outputTypeFor("image/jpeg")).toBe("image/jpeg");
  });

  it("keeps every image in its own format, so screenshots stay PNG", () => {
    expect(outputTypeFor("image/png")).toBe("image/png");
    expect(outputTypeFor("image/webp")).toBe("image/webp");
  });

  it("re-encodes a PNG only when it needs resizing", () => {
    expect(isEncodeNeeded({ type: "image/png", resized: false })).toBe(false);
    expect(isEncodeNeeded({ type: "image/png", resized: true })).toBe(true);
    expect(isEncodeNeeded({ type: "image/jpeg", resized: false })).toBe(true);
  });

  it("leaves GIF and unknown types alone", () => {
    expect(isCompressibleImage("image/gif")).toBe(false);
    expect(isCompressibleImage("image/svg+xml")).toBe(false);
    expect(isCompressibleImage("IMAGE/PNG")).toBe(true);
  });

  it("uses the preset quality", () => {
    const plan = planEncode({ type: "image/webp", width: 100, height: 100 }, { preset: "small", maxDimension: 0 });
    expect(plan).toMatchObject({ type: "image/webp", quality: PRESETS.small.quality, resized: false });
  });
});

describe("renameForType", () => {
  it("swaps the extension", () => {
    expect(renameForType("shot.png", "image/webp")).toBe("shot.webp");
    expect(renameForType("my.photo.jpeg", "image/jpeg")).toBe("my.photo.jpg");
  });

  it("handles names without a usable base", () => {
    expect(renameForType(".png", "image/webp")).toBe(".png.webp");
    expect(renameForType("pasted", "image/webp")).toBe("pasted.webp");
  });
});

describe("keeping the processed file", () => {
  it("keeps the original when the output is larger or equal", () => {
    expect(shouldKeepProcessed(1000, 1000, false)).toBe(false);
    expect(shouldKeepProcessed(1000, 1200, true)).toBe(false);
  });

  it("ignores tiny savings unless the image was resized", () => {
    expect(shouldKeepProcessed(100_000, 99_500, false)).toBe(false);
    expect(shouldKeepProcessed(100_000, 99_500, true)).toBe(true);
    expect(shouldKeepProcessed(100_000, 90_000, false)).toBe(true);
  });

  it("reports whole-number savings and never a negative one", () => {
    expect(percentSaved(1000, 400)).toBe(60);
    expect(percentSaved(1000, 1500)).toBe(0);
    expect(percentSaved(0, 0)).toBe(0);
  });
});

describe("compression settings", () => {
  it("accepts the defaults", () => {
    expect(compressionSettingsSchema.safeParse(DEFAULT_COMPRESSION_SETTINGS).success).toBe(true);
  });

  it("rejects dimensions that are not offered", () => {
    expect(compressionSettingsSchema.safeParse({ ...DEFAULT_COMPRESSION_SETTINGS, maxDimension: 999 }).success).toBe(
      false,
    );
  });
});
