import { describe, expect, it } from "vitest";
import { uploadReducer, type UploadItem } from "@/lib/uploads/state";

function item(overrides: Partial<UploadItem> = {}): UploadItem {
  return {
    id: "a",
    name: "shot.png",
    size: 1000,
    status: "waiting",
    progress: null,
    error: null,
    retryable: false,
    itemId: null,
    uploaded: null,
    compression: null,
    ...overrides,
  };
}

const asset = { publicId: "quickdrop/u1/abc", assetId: "f".repeat(32), resourceType: "image" as const, bytes: 1000 };

describe("uploadReducer", () => {
  it("moves an upload through preparing, uploading, saving and completed", () => {
    let items = uploadReducer([item()], { type: "add", items: [] });
    items = uploadReducer(items, { type: "status", id: "a", status: "preparing" });
    expect(items[0].status).toBe("preparing");

    items = uploadReducer(items, { type: "status", id: "a", status: "uploading" });
    expect(items[0]).toMatchObject({ status: "uploading", progress: 0 });

    items = uploadReducer(items, { type: "progress", id: "a", progress: 0.5 });
    expect(items[0].progress).toBe(0.5);

    items = uploadReducer(items, { type: "uploaded", id: "a", uploaded: asset });
    expect(items[0]).toMatchObject({ status: "saving", uploaded: asset });

    items = uploadReducer(items, { type: "completed", id: "a", itemId: "item1" });
    expect(items[0]).toMatchObject({ status: "completed", progress: 1, itemId: "item1" });
  });

  it("only retries failed items that are marked retryable", () => {
    const retryable = uploadReducer([item({ status: "failed", retryable: true, error: "x" })], {
      type: "retry",
      id: "a",
    });
    expect(retryable[0]).toMatchObject({ status: "waiting", error: null });

    const unsupported = uploadReducer([item({ status: "failed", retryable: false, error: "x" })], {
      type: "retry",
      id: "a",
    });
    expect(unsupported[0].status).toBe("failed");
  });

  it("cancels only unfinished items", () => {
    const active = uploadReducer([item({ status: "uploading" })], { type: "cancel", id: "a" });
    expect(active[0].status).toBe("cancelled");

    const done = uploadReducer([item({ status: "completed" })], { type: "cancel", id: "a" });
    expect(done[0].status).toBe("completed");
  });

  it("keeps the uploaded file when a save fails, so retry does not upload again", () => {
    const failed = uploadReducer(
      [item({ status: "saving", uploaded: asset })],
      { type: "failed", id: "a", error: "save failed", retryable: true },
    );
    expect(failed[0]).toMatchObject({ status: "failed", uploaded: asset });
  });

  it("ignores progress outside the uploading stage", () => {
    const items = uploadReducer([item({ status: "preparing" })], { type: "progress", id: "a", progress: 0.9 });
    expect(items[0].progress).toBeNull();
  });

  it("removes only finished items when clearing or dismissing", () => {
    const items = [
      item({ id: "a", status: "completed" }),
      item({ id: "b", status: "uploading" }),
      item({ id: "c", status: "failed", retryable: false }),
    ];
    expect(uploadReducer(items, { type: "clearFinished" }).map((i) => i.id)).toEqual(["b"]);
    expect(uploadReducer(items, { type: "dismiss", id: "b" })).toHaveLength(3);
    expect(uploadReducer(items, { type: "dismiss", id: "c" }).map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("clears only finished successes and cancellations, keeping failures for retry", () => {
    const items = [
      item({ id: "a", status: "completed" }),
      item({ id: "b", status: "cancelled" }),
      item({ id: "c", status: "failed", retryable: true }),
      item({ id: "d", status: "uploading" }),
    ];
    expect(uploadReducer(items, { type: "clearDone" }).map((i) => i.id)).toEqual(["c", "d"]);
  });

  it("records the compression result only while compressing", () => {
    const summary = {
      outcome: "compressed" as const,
      reason: null,
      originalBytes: 1000,
      processedBytes: 400,
      width: null,
      height: null,
    };
    let items = uploadReducer([item()], { type: "compressed", id: "a", compression: summary });
    expect(items[0].compression).toBeNull();

    items = uploadReducer(items, { type: "status", id: "a", status: "compressing" });
    items = uploadReducer(items, { type: "compressed", id: "a", compression: summary });
    expect(items[0]).toMatchObject({ status: "compressing", compression: summary });

    items = uploadReducer(items, { type: "cancel", id: "a" });
    expect(items[0].status).toBe("cancelled");
  });
});
