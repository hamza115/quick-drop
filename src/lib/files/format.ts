import { KIND_LABELS, type FileItem } from "@/lib/files/constants";

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  const rounded = exponent === 0 || value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[exponent]}`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(iso));
}

/**
 * Short, human time like the reference design: "Just now", "2 min ago", "5 hours ago",
 * "Yesterday 2:20 pm", "Mon 10:44 am", then "12 Mar" / "12 Mar 2025" for older dates.
 * Uses the runtime's time zone, so render it in the browser (see components/ui/relative-time.tsx).
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  if (!Number.isFinite(diffMs)) return "";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 12 && date.toDateString() === now.toDateString()) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;

  // Newer Intl data puts a narrow no-break space before "PM"; normalise it to a plain space.
  const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" })
    .format(date)
    .replace(/\s+/g, " ")
    .toLowerCase();
  if (date.toDateString() === now.toDateString()) return `Today ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
  if (diffMs < 6 * 24 * 60 * 60 * 1000) {
    return `${new Intl.DateTimeFormat("en", { weekday: "short" }).format(date)} ${time}`;
  }
  const sameYear = date.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat("en-GB", sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Escapes text for use inside a RegExp so user search input is matched literally. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Uses the first non-empty line of a note as its title when no title is given. */
export function deriveNoteTitle(text: string): string {
  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return "Untitled note";
  return firstLine.length > 60 ? `${firstLine.slice(0, 59).trimEnd()}…` : firstLine;
}

/** Short secondary line for cards and rows. */
export function itemSummary(
  item: Pick<FileItem, "kind" | "linkUrl" | "originalSizeBytes"> & { storedSizeBytes?: number | null },
): string {
  if (item.kind === "link") return hostnameOf(item.linkUrl ?? "");
  if (item.kind === "note") return KIND_LABELS.note;
  return `${KIND_LABELS[item.kind]} · ${formatBytes(item.storedSizeBytes ?? item.originalSizeBytes)}`;
}
