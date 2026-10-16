import { formatBytes } from "@/lib/files/format";
import { normalizeUrlInput, parseWebUrl } from "@/lib/files/validation";

// Client-safe. The server runs the same rules again, so the browser check is only for fast feedback.

export type UploadKind = "image" | "video" | "document" | "archive";
export type CloudinaryResourceType = "image" | "video" | "raw";

export interface UploadRule {
  extensions: readonly string[];
  kind: UploadKind;
  resourceType: CloudinaryResourceType;
  mimeType: string;
  maxBytes: number;
}

const MB = 1024 * 1024;

/**
 * Accepted file types and size limits. The limits are defaults: check them against
 * your Cloudinary plan before launch. Scripts, HTML and SVG are deliberately absent.
 */
export const UPLOAD_RULES: readonly UploadRule[] = [
  { extensions: ["jpg", "jpeg"], kind: "image", resourceType: "image", mimeType: "image/jpeg", maxBytes: 10 * MB },
  { extensions: ["png"], kind: "image", resourceType: "image", mimeType: "image/png", maxBytes: 10 * MB },
  { extensions: ["webp"], kind: "image", resourceType: "image", mimeType: "image/webp", maxBytes: 10 * MB },
  { extensions: ["gif"], kind: "image", resourceType: "image", mimeType: "image/gif", maxBytes: 10 * MB },
  { extensions: ["mp4"], kind: "video", resourceType: "video", mimeType: "video/mp4", maxBytes: 100 * MB },
  { extensions: ["webm"], kind: "video", resourceType: "video", mimeType: "video/webm", maxBytes: 100 * MB },
  { extensions: ["mov"], kind: "video", resourceType: "video", mimeType: "video/quicktime", maxBytes: 100 * MB },
  { extensions: ["pdf"], kind: "document", resourceType: "raw", mimeType: "application/pdf", maxBytes: 25 * MB },
  { extensions: ["txt"], kind: "document", resourceType: "raw", mimeType: "text/plain", maxBytes: 10 * MB },
  { extensions: ["csv"], kind: "document", resourceType: "raw", mimeType: "text/csv", maxBytes: 10 * MB },
  {
    extensions: ["docx"],
    kind: "document",
    resourceType: "raw",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    maxBytes: 25 * MB,
  },
  {
    extensions: ["xlsx"],
    kind: "document",
    resourceType: "raw",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    maxBytes: 25 * MB,
  },
  {
    extensions: ["pptx"],
    kind: "document",
    resourceType: "raw",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    maxBytes: 25 * MB,
  },
  { extensions: ["zip"], kind: "archive", resourceType: "raw", mimeType: "application/zip", maxBytes: 100 * MB },
];

/**
 * Finds the rule for a file. The extension decides when there is one. Without an extension
 * (common for pasted images), the MIME type is used. An unknown extension is always rejected.
 */
export function findUploadRule(name: string, mimeType = ""): UploadRule | null {
  const dot = name.lastIndexOf(".");
  if (dot >= 0 && dot < name.length - 1) {
    const extension = name.slice(dot + 1).toLowerCase();
    return UPLOAD_RULES.find((rule) => rule.extensions.includes(extension)) ?? null;
  }
  if (dot >= 0) return null;
  const mime = mimeType.toLowerCase();
  return mime ? (UPLOAD_RULES.find((rule) => rule.mimeType === mime) ?? null) : null;
}

/** Keeps only the base name, strips control characters, and limits the length. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 200);
  return cleaned || "upload";
}

/** Value for the file input's accept attribute, for example ".jpg,.png,.pdf". */
export function acceptAttribute(): string {
  return UPLOAD_RULES.flatMap((rule) => rule.extensions)
    .map((extension) => `.${extension}`)
    .join(",");
}

export function supportedTypesDescription(): string {
  return UPLOAD_RULES.flatMap((rule) => rule.extensions)
    .map((extension) => extension.toUpperCase())
    .join(", ");
}

export function maxSizeLabel(rule: UploadRule): string {
  return formatBytes(rule.maxBytes);
}

/** True when pasted or dropped text is a single web address. Anything else is saved as a note. */
export function isLikelyUrlText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  return parseWebUrl(normalizeUrlInput(trimmed)) !== null;
}
