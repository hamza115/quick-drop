import type { CompressionSummary } from "@/lib/compression/compress";
import type { UploadedAsset } from "@/lib/uploads/types";

export type UploadStatus =
  | "waiting"
  | "compressing"
  | "preparing"
  | "uploading"
  | "saving"
  | "completed"
  | "failed"
  | "cancelled";

export const ACTIVE_STATUSES: ReadonlySet<UploadStatus> = new Set<UploadStatus>([
  "compressing",
  "preparing",
  "uploading",
  "saving",
]);
const FINISHED_STATUSES: ReadonlySet<UploadStatus> = new Set<UploadStatus>(["completed", "failed", "cancelled"]);

export function isFinished(status: UploadStatus): boolean {
  return FINISHED_STATUSES.has(status);
}

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  status: UploadStatus;
  /** 0 to 1 while uploading or compressing a video, or null when progress is unknown. */
  progress: number | null;
  error: string | null;
  retryable: boolean;
  /** Set once the library item is saved, so the queue can link to it. */
  itemId: string | null;
  /** Set once Cloudinary has the file. Retrying the save then does not upload again. */
  uploaded: UploadedAsset | null;
  /** Set once the image step has run. Null for files that are never compressed (videos, documents). */
  compression: CompressionSummary | null;
}

export type UploadAction =
  | { type: "add"; items: UploadItem[] }
  | { type: "status"; id: string; status: UploadStatus }
  | { type: "progress"; id: string; progress: number | null }
  | { type: "compressed"; id: string; compression: CompressionSummary }
  | { type: "uploaded"; id: string; uploaded: UploadedAsset }
  | { type: "completed"; id: string; itemId: string }
  | { type: "failed"; id: string; error: string; retryable: boolean }
  | { type: "cancel"; id: string }
  | { type: "retry"; id: string }
  | { type: "dismiss"; id: string }
  | { type: "clearFinished" }
  /** Removes uploads that succeeded or were cancelled. Failures stay until retried or removed. */
  | { type: "clearDone" };

function update(items: UploadItem[], id: string, change: (item: UploadItem) => UploadItem): UploadItem[] {
  return items.map((item) => (item.id === id ? change(item) : item));
}

export function uploadReducer(items: UploadItem[], action: UploadAction): UploadItem[] {
  switch (action.type) {
    case "add":
      return [...items, ...action.items];

    case "status":
      return update(items, action.id, (item) => {
        if (isFinished(item.status)) return item;
        return {
          ...item,
          status: action.status,
          progress: action.status === "uploading" ? 0 : action.status === item.status ? item.progress : null,
        };
      });

    case "progress":
      // Video compression reports progress too. Images compress quickly and show an indeterminate bar.
      return update(items, action.id, (item) =>
        item.status === "uploading" || item.status === "compressing" ? { ...item, progress: action.progress } : item,
      );

    case "compressed":
      return update(items, action.id, (item) =>
        item.status === "compressing" ? { ...item, compression: action.compression } : item,
      );

    case "uploaded":
      return update(items, action.id, (item) =>
        item.status === "uploading"
          ? { ...item, uploaded: action.uploaded, status: "saving", progress: null }
          : item,
      );

    case "completed":
      return update(items, action.id, (item) => ({
        ...item,
        status: "completed",
        progress: 1,
        itemId: action.itemId,
        error: null,
        retryable: false,
      }));

    case "failed":
      return update(items, action.id, (item) => ({
        ...item,
        status: "failed",
        error: action.error,
        retryable: action.retryable,
        progress: null,
      }));

    case "cancel":
      return update(items, action.id, (item) =>
        isFinished(item.status) ? item : { ...item, status: "cancelled", progress: null },
      );

    case "retry":
      return update(items, action.id, (item) =>
        item.status === "failed" && item.retryable
          ? { ...item, status: "waiting", error: null, progress: null }
          : item,
      );

    case "dismiss":
      return items.filter((item) => !(item.id === action.id && isFinished(item.status)));

    case "clearFinished":
      return items.filter((item) => !isFinished(item.status));

    case "clearDone":
      return items.filter((item) => item.status !== "completed" && item.status !== "cancelled");
  }
}
