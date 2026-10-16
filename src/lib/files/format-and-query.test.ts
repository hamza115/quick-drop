import { describe, expect, it } from "vitest";
import { deriveNoteTitle, formatRelativeTime, escapeRegExp, formatBytes, hostnameOf, itemSummary } from "@/lib/files/format";
import { buildLibraryHref, parseLibraryParams, parseViewMode } from "@/lib/files/query";
import { listQuerySchema } from "@/lib/files/validation";

describe("formatBytes", () => {
  it("formats common sizes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 MB");
    expect(formatBytes(12 * 1024 * 1024)).toBe("12 MB");
  });
});

describe("hostnameOf", () => {
  it("drops the www prefix", () => {
    expect(hostnameOf("https://www.example.com/page")).toBe("example.com");
  });
});

describe("escapeRegExp", () => {
  it("makes user search text match literally", () => {
    const pattern = new RegExp(escapeRegExp("a.c*(d)"));
    expect(pattern.test("a.c*(d)")).toBe(true);
    expect(pattern.test("abc")).toBe(false);
  });
});

describe("deriveNoteTitle", () => {
  it("uses the first non-empty line", () => {
    expect(deriveNoteTitle("\n  Shopping list\nmilk, eggs")).toBe("Shopping list");
  });

  it("truncates long first lines", () => {
    const title = deriveNoteTitle("x".repeat(100));
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title.endsWith("…")).toBe(true);
  });

  it("falls back when the note is blank", () => {
    expect(deriveNoteTitle("   ")).toBe("Untitled note");
  });
});

describe("itemSummary", () => {
  it("shows the host for links and the size for files", () => {
    expect(itemSummary({ kind: "link", linkUrl: "https://docs.example.com", originalSizeBytes: 0 })).toBe(
      "docs.example.com",
    );
    expect(itemSummary({ kind: "image", linkUrl: null, originalSizeBytes: 2048 })).toBe("Image · 2 KB");
  });
});

describe("parseLibraryParams", () => {
  it("falls back to defaults when the URL contains invalid values", () => {
    const query = parseLibraryParams({ sort: "bogus", page: "abc", type: "image" });
    expect(query.sort).toBe("newest");
    expect(query.page).toBe(1);
    expect(query.type).toBe("image");
  });

  it("uses the first value when a parameter is repeated", () => {
    expect(parseLibraryParams({ q: ["cat", "dog"] }).q).toBe("cat");
  });
});

describe("buildLibraryHref", () => {
  const base = { query: listQuerySchema.parse({}), view: "grid" as const };

  it("returns the bare library path for default state", () => {
    expect(buildLibraryHref(base, {})).toBe("/");
  });

  it("keeps existing filters and changes only what is passed", () => {
    const state = { query: listQuerySchema.parse({ type: "image", sort: "name" }), view: "list" as const };
    expect(buildLibraryHref(state, { page: 2 })).toBe("/?type=image&sort=name&page=2&view=list");
  });

  it("can switch the view without touching filters", () => {
    expect(buildLibraryHref(base, { view: "list" })).toBe("/?view=list");
  });
});

describe("saved library defaults", () => {
  const defaults = { sort: "name" as const, view: "list" as const };

  it("uses the saved sort and view when the URL has none", () => {
    expect(parseLibraryParams({}, defaults).sort).toBe("name");
    expect(parseViewMode({}, defaults.view)).toBe("list");
    expect(parseViewMode({ view: "grid" }, defaults.view)).toBe("grid");
  });

  it("keeps a non-default choice in the URL and leaves out the saved default", () => {
    const state = { query: parseLibraryParams({}, defaults), view: defaults.view, defaults };
    expect(buildLibraryHref(state, {})).toBe("/");
    expect(buildLibraryHref(state, { sort: "newest", view: "grid" })).toBe("/?sort=newest&view=grid");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date(2026, 9, 14, 15, 0); // Wed 14 Oct 2026, 3:00 pm

  it("uses short relative text for recent times", () => {
    expect(formatRelativeTime(new Date(2026, 9, 14, 14, 59, 40).toISOString(), now)).toBe("Just now");
    expect(formatRelativeTime(new Date(2026, 9, 14, 14, 58).toISOString(), now)).toBe("2 min ago");
    expect(formatRelativeTime(new Date(2026, 9, 14, 10, 0).toISOString(), now)).toBe("5 hours ago");
  });

  it("uses day names and dates for older items", () => {
    expect(formatRelativeTime(new Date(2026, 9, 13, 14, 20).toISOString(), now)).toBe("Yesterday 2:20 pm");
    expect(formatRelativeTime(new Date(2026, 9, 12, 10, 44).toISOString(), now)).toBe("Mon 10:44 am");
    expect(formatRelativeTime(new Date(2026, 2, 12).toISOString(), now)).toBe("12 Mar");
    expect(formatRelativeTime(new Date(2025, 2, 12).toISOString(), now)).toBe("12 Mar 2025");
  });
});
