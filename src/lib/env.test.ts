import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env";

const validEnv = {
  NODE_ENV: "development",
  MONGODB_URI: "mongodb+srv://user:pass@cluster0.example.mongodb.net/",
  AUTH_SECRET: "x".repeat(32),
  APP_URL: "http://localhost:3000",
};

describe("parseServerEnv", () => {
  it("accepts a complete development configuration and applies defaults", () => {
    const env = parseServerEnv(validEnv);
    expect(env.MONGODB_DB_NAME).toBe("quickdrop");
    expect(env.APP_URL).toBe("http://localhost:3000");
  });

  it("rejects a short auth secret", () => {
    expect(() => parseServerEnv({ ...validEnv, AUTH_SECRET: "too-short" })).toThrow(
      /AUTH_SECRET must be at least 32 characters/,
    );
  });

  it("rejects a MongoDB URI without a MongoDB scheme", () => {
    expect(() => parseServerEnv({ ...validEnv, MONGODB_URI: "https://example.com" })).toThrow(
      /MONGODB_URI/,
    );
  });

  it("rejects a non-HTTP APP_URL", () => {
    expect(() => parseServerEnv({ ...validEnv, APP_URL: "javascript:alert(1)" })).toThrow(
      /APP_URL/,
    );
  });

  it("requires https APP_URL in production", () => {
    expect(() =>
      parseServerEnv({ ...validEnv, NODE_ENV: "production", APP_URL: "http://quickdrop.example.com" }),
    ).toThrow(/https/);
    expect(
      parseServerEnv({ ...validEnv, NODE_ENV: "production", APP_URL: "https://quickdrop.example.com" })
        .APP_URL,
    ).toBe("https://quickdrop.example.com");
  });

  it("lists every problem at once", () => {
    expect(() => parseServerEnv({ NODE_ENV: "development" })).toThrow(
      /MONGODB_URI[\s\S]*AUTH_SECRET[\s\S]*APP_URL/,
    );
  });
});
