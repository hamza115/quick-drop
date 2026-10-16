import { describe, expect, it } from "vitest";
import {
  acceptAttribute,
  findUploadRule,
  isLikelyUrlText,
  sanitizeFileName,
  supportedTypesDescription,
} from "@/lib/uploads/policy";

describe("findUploadRule", () => {
  it("matches extensions case-insensitively", () => {
    expect(findUploadRule("Screenshot.PNG")?.mimeType).toBe("image/png");
    expect(findUploadRule("clip.MP4")?.kind).toBe("video");
  });

  it("uses the MIME type for names without an extension, such as pasted images", () => {
    expect(findUploadRule("image", "image/jpeg")?.kind).toBe("image");
  });

  it("rejects executables, HTML and SVG", () => {
    expect(findUploadRule("setup.exe")).toBeNull();
    expect(findUploadRule("page.html")).toBeNull();
    expect(findUploadRule("logo.svg")).toBeNull();
  });

  it("rejects double extensions that hide an executable", () => {
    expect(findUploadRule("photo.jpg.exe")).toBeNull();
  });

  it("does not trust a MIME type that contradicts a known extension", () => {
    expect(findUploadRule("notes.exe", "image/png")).toBeNull();
  });
});

describe("sanitizeFileName", () => {
  it("keeps only the base name", () => {
    expect(sanitizeFileName("../../etc/report.pdf")).toBe("report.pdf");
    expect(sanitizeFileName("C:\\Users\\me\\photo.png")).toBe("photo.png");
  });

  it("removes control characters and falls back when nothing is left", () => {
    expect(sanitizeFileName("bad\u0000name.png")).toBe("badname.png");
    expect(sanitizeFileName("   ")).toBe("upload");
  });
});

describe("acceptAttribute and supportedTypesDescription", () => {
  it("lists every accepted extension", () => {
    expect(acceptAttribute()).toContain(".jpg");
    expect(acceptAttribute()).toContain(".pdf");
    expect(supportedTypesDescription()).toContain("PNG");
  });
});

describe("isLikelyUrlText", () => {
  it("treats a single web address as a link", () => {
    expect(isLikelyUrlText("https://example.com/page")).toBe(true);
    expect(isLikelyUrlText("example.com")).toBe(true);
  });

  it("treats sentences and multi-line text as notes", () => {
    expect(isLikelyUrlText("remember to call the bank")).toBe(false);
    expect(isLikelyUrlText("https://example.com and more")).toBe(false);
    expect(isLikelyUrlText("line one\nline two")).toBe(false);
  });

  it("does not treat script URLs as links", () => {
    expect(isLikelyUrlText("javascript:alert(1)")).toBe(false);
  });
});
