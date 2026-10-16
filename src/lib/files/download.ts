// Client-safe helpers for download names.

/**
 * Cloudinary's attachment flag accepts a plain name only: no dots, slashes, commas or spaces.
 * The extension is added by Cloudinary from the stored format.
 */
export function attachmentBaseName(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, "");
  const cleaned = base
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // accents split off by NFKD, so "é" becomes "e"
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 100);
  return cleaned || "quickdrop-file";
}
