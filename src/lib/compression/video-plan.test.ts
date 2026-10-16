import { describe, expect, it } from "vitest";
import { compressionSettingsSchema } from "@/lib/compression/settings";
import { renameWithExtension } from "@/lib/compression/plan";
import {
  buildVideoArgs,
  isCompressibleVideo,
  normaliseProgress,
  scaleFilter,
  VIDEO_CRF,
} from "@/lib/compression/video-plan";

describe("video rules", () => {
  it("accepts the video types QuickDrop uploads", () => {
    expect(isCompressibleVideo("video/mp4")).toBe(true);
    expect(isCompressibleVideo("VIDEO/QUICKTIME")).toBe(true);
    expect(isCompressibleVideo("video/x-msvideo")).toBe(false);
  });

  it("caps the shorter edge, keeps dimensions even and never upscales", () => {
    const filter = scaleFilter(720);
    expect(filter).toContain("min(iw,720)");
    expect(filter).toContain("min(ih,720)");
    expect(filter).toContain("-2");
    expect(scaleFilter(721)).toContain("min(iw,720)");
  });

  it("builds an MP4 command with the preset quality and stripped metadata", () => {
    const args = buildVideoArgs({ input: "/input/clip.mov", output: "/output.mp4", maxShortEdge: 1080, preset: "small" });
    expect(args[0]).toBe("-i");
    expect(args.at(-1)).toBe("/output.mp4");
    expect(args).toContain("libx264");
    expect(args[args.indexOf("-crf") + 1]).toBe(String(VIDEO_CRF.small));
    expect(args[args.indexOf("-map_metadata") + 1]).toBe("-1");
    expect(args).toContain("+faststart");
  });

  it("clamps progress and hides nonsense values", () => {
    expect(normaliseProgress(0.4)).toBe(0.4);
    expect(normaliseProgress(1.7)).toBe(1);
    expect(normaliseProgress(-3)).toBeNull();
    expect(normaliseProgress(Number.NaN)).toBeNull();
  });

  it("renames the output to .mp4", () => {
    expect(renameWithExtension("clip.MOV", "mp4")).toBe("clip.mp4");
    expect(renameWithExtension("screen recording", "mp4")).toBe("screen recording.mp4");
  });
});

describe("settings saved before video compression existed", () => {
  it("still load, with video compression off", () => {
    const parsed = compressionSettingsSchema.safeParse({ enabled: true, preset: "high", maxDimension: 1920 });
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({ preset: "high", videoEnabled: false, videoResolution: 720 });
  });
});
