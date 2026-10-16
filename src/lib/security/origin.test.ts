import { describe, expect, it } from "vitest";
import { isSameOriginRequest, originOf } from "@/lib/security/origin";

function headers(values: Record<string, string>) {
  return { get: (name: string) => values[name.toLowerCase()] ?? null };
}

const allowed = ["https://quickdrop.example.com"];

describe("isSameOriginRequest", () => {
  it("accepts the app's own origin, ignoring case", () => {
    expect(isSameOriginRequest(headers({ origin: "https://QuickDrop.example.com" }), allowed)).toBe(true);
  });

  it("rejects other sites and opaque origins", () => {
    expect(isSameOriginRequest(headers({ origin: "https://evil.example" }), allowed)).toBe(false);
    expect(isSameOriginRequest(headers({ origin: "null" }), allowed)).toBe(false);
    expect(isSameOriginRequest(headers({ origin: "http://quickdrop.example.com" }), allowed)).toBe(false);
  });

  it("falls back to Sec-Fetch-Site when Origin is missing", () => {
    expect(isSameOriginRequest(headers({ "sec-fetch-site": "same-origin" }), allowed)).toBe(true);
    expect(isSameOriginRequest(headers({ "sec-fetch-site": "cross-site" }), allowed)).toBe(false);
    expect(isSameOriginRequest(headers({ "sec-fetch-site": "same-site" }), allowed)).toBe(false);
  });

  it("allows non-browser clients that send neither header", () => {
    expect(isSameOriginRequest(headers({}), allowed)).toBe(true);
  });
});

describe("originOf", () => {
  it("normalises URLs and rejects invalid ones", () => {
    expect(originOf("https://App.example.com/path?q=1")).toBe("https://app.example.com");
    expect(originOf("not a url")).toBeNull();
  });
});
