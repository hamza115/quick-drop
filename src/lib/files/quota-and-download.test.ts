import { describe, expect, it } from "vitest";
import { attachmentBaseName } from "@/lib/files/download";
import { limitBytesFromMb, quotaLevel, wouldExceedQuota } from "@/lib/files/quota";
import { effectiveMaxBytes, updatePreferencesSchema } from "@/lib/preferences/constants";

const MB = 1024 * 1024;

describe("quota", () => {
  it("has no level without a configured limit", () => {
    expect(quotaLevel(10 * MB, null)).toBe("none");
    expect(wouldExceedQuota(10 * MB, 10 * MB, null)).toBe(false);
  });

  it("warns at 80% and is full at 100%", () => {
    expect(quotaLevel(79 * MB, 100 * MB)).toBe("ok");
    expect(quotaLevel(80 * MB, 100 * MB)).toBe("warning");
    expect(quotaLevel(100 * MB, 100 * MB)).toBe("full");
  });

  it("refuses an upload that would go over the limit", () => {
    expect(wouldExceedQuota(90 * MB, 10 * MB, 100 * MB)).toBe(false);
    expect(wouldExceedQuota(90 * MB, 10 * MB + 1, 100 * MB)).toBe(true);
    expect(limitBytesFromMb(undefined)).toBeNull();
    expect(limitBytesFromMb(2)).toBe(2 * MB);
  });
});

describe("personal upload cap", () => {
  it("can lower but never raise the type limit", () => {
    expect(effectiveMaxBytes(10 * MB, null)).toBe(10 * MB);
    expect(effectiveMaxBytes(10 * MB, 5)).toBe(5 * MB);
    expect(effectiveMaxBytes(10 * MB, 50)).toBe(10 * MB);
  });

  it("accepts only offered values and known fields", () => {
    expect(updatePreferencesSchema.safeParse({ maxUploadMb: 25 }).success).toBe(true);
    expect(updatePreferencesSchema.safeParse({ maxUploadMb: null }).success).toBe(true);
    expect(updatePreferencesSchema.safeParse({ maxUploadMb: 7 }).success).toBe(false);
    expect(updatePreferencesSchema.safeParse({ ownerId: "someone-else" }).success).toBe(false);
  });
});

describe("attachmentBaseName", () => {
  it("removes the extension and unsafe characters", () => {
    expect(attachmentBaseName("Bug report (final).pdf")).toBe("Bug_report_final");
    expect(attachmentBaseName("../../etc/passwd")).toBe("etc_passwd");
    expect(attachmentBaseName("résumé.docx")).toBe("resume");
  });

  it("falls back when nothing usable is left", () => {
    expect(attachmentBaseName("ありがとう.png")).toBe("quickdrop-file");
    expect(attachmentBaseName("")).toBe("quickdrop-file");
  });
});
