import { describe, expect, it } from "vitest";
import {
  createItemSchema,
  listQuerySchema,
  normalizeUrlInput,
  parseWebUrl,
  updateItemSchema,
} from "@/lib/files/validation";

describe("parseWebUrl", () => {
  it("accepts http and https addresses", () => {
    expect(parseWebUrl("https://example.com/a")?.href).toBe("https://example.com/a");
    expect(parseWebUrl("http://example.com")?.protocol).toBe("http:");
  });

  it("rejects script, data and other non-web schemes", () => {
    expect(parseWebUrl("javascript:alert(1)")).toBeNull();
    expect(parseWebUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(parseWebUrl("ftp://example.com")).toBeNull();
  });

  it("rejects addresses with embedded credentials", () => {
    expect(parseWebUrl("https://user:secret@example.com")).toBeNull();
  });

  it("rejects text that is not a URL", () => {
    expect(parseWebUrl("not a url")).toBeNull();
  });
});

describe("normalizeUrlInput", () => {
  it("adds https:// to bare domains", () => {
    expect(normalizeUrlInput("example.com/path")).toBe("https://example.com/path");
  });

  it("leaves addresses with a scheme unchanged", () => {
    expect(normalizeUrlInput("http://example.com")).toBe("http://example.com");
  });

  it("does not turn a javascript: scheme into a web address", () => {
    expect(normalizeUrlInput("javascript:alert(1)")).toBe("javascript:alert(1)");
  });
});

describe("createItemSchema", () => {
  it("normalises a link to its full href", () => {
    const result = createItemSchema.safeParse({ type: "link", url: "example.com" });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === "link") {
      expect(result.data.url).toBe("https://example.com/");
    }
  });

  it("rejects a link with an unsafe scheme", () => {
    expect(createItemSchema.safeParse({ type: "link", url: "javascript:alert(1)" }).success).toBe(false);
  });

  it("requires text for a note", () => {
    expect(createItemSchema.safeParse({ type: "note", text: "   " }).success).toBe(false);
    expect(createItemSchema.safeParse({ type: "note", text: "Remember this" }).success).toBe(true);
  });

  it("rejects unknown fields so clients cannot set ownerId", () => {
    expect(
      createItemSchema.safeParse({ type: "note", text: "hi", ownerId: "someone-else" }).success,
    ).toBe(false);
  });
});

describe("updateItemSchema", () => {
  it("accepts allowed fields", () => {
    expect(updateItemSchema.safeParse({ displayName: "Renamed", isFavorite: true }).success).toBe(true);
  });

  it("rejects an empty update", () => {
    expect(updateItemSchema.safeParse({}).success).toBe(false);
  });

  it("rejects fields that are not editable, such as ownerId or kind", () => {
    expect(updateItemSchema.safeParse({ ownerId: "x" }).success).toBe(false);
    expect(updateItemSchema.safeParse({ kind: "image" }).success).toBe(false);
  });

  it("limits the number of tags", () => {
    const tags = Array.from({ length: 21 }, (_, index) => `tag${index}`);
    expect(updateItemSchema.safeParse({ tags }).success).toBe(false);
  });
});

describe("listQuerySchema", () => {
  it("applies defaults", () => {
    const query = listQuerySchema.parse({});
    expect(query).toMatchObject({ type: "all", favorites: false, q: "", sort: "newest", page: 1, pageSize: 24 });
  });

  it("turns favorites=1 into a boolean", () => {
    expect(listQuerySchema.parse({ favorites: "1" }).favorites).toBe(true);
  });

  it("rejects unknown sort options and oversized pages", () => {
    expect(listQuerySchema.safeParse({ sort: "random" }).success).toBe(false);
    expect(listQuerySchema.safeParse({ pageSize: "500" }).success).toBe(false);
  });
});
