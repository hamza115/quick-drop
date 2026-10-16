import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";

describe("cn", () => {
  it("skips falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("lets later classes win over conflicting earlier ones", () => {
    expect(cn("items-center gap-2.5", "items-start gap-4")).toBe("items-start gap-4");
    expect(cn("h-11 text-base sm:text-sm", "h-9 text-sm")).toBe("sm:text-sm h-9 text-sm");
  });

  it("knows the project's custom radius and shadow scales", () => {
    expect(cn("rounded-card shadow-soft", "rounded-full shadow-float")).toBe("rounded-full shadow-float");
  });
});

describe("cn with the type scale", () => {
  it("keeps a text size and a text colour together", () => {
    expect(cn("text-caption text-muted")).toBe("text-caption text-muted");
    expect(cn("text-body", "text-title")).toBe("text-title");
  });
});
