import type { FileKind } from "@/lib/files/constants";
import { cn } from "@/lib/cn";

const PATHS: Record<FileKind, string[]> = {
  image: ["M4 5h16v14H4z", "m4 16 5-5 4 4 2-2 5 5", "M9 9.5h.01"],
  video: ["M4 6h11v12H4z", "m15 10 5-3v10l-5-3"],
  document: ["M7 3h7l5 5v13H7z", "M14 3v5h5", "M10 13h6M10 17h6"],
  archive: ["M4 7h16v12H4z", "M4 7l2-3h12l2 3", "M10 11h4"],
  other: ["M7 3h7l5 5v13H7z", "M14 3v5h5"],
  link: ["M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1", "M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"],
  note: ["M6 4h12v16H6z", "M9 9h6M9 13h6M9 17h3"],
};

interface FileTypeIconProps {
  kind: FileKind;
  className?: string;
}

/** Simple line icon for each file kind. Decorative: the text label next to it carries the meaning. */
export function FileTypeIcon({ kind, className }: FileTypeIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-6", className)}
    >
      {PATHS[kind].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/*
 * The design is monochrome: every kind uses the same grey tile with a dark icon; the icon shape
 * tells kinds apart. Kept as maps so a per-kind tint can be reintroduced in one place.
 */
const MONO_TILE = "bg-surface-container text-foreground";

export const KIND_TILE_CLASSES: Record<FileKind, string> = {
  image: MONO_TILE,
  video: MONO_TILE,
  document: MONO_TILE,
  archive: MONO_TILE,
  other: MONO_TILE,
  link: MONO_TILE,
  note: MONO_TILE,
};

/** Larger previews use the same monochrome well. */
export const KIND_GRADIENT_CLASSES: Record<FileKind, string> = KIND_TILE_CLASSES;

const TILE_SIZES = {
  xs: { tile: "size-8 rounded-lg", icon: "size-[1.125rem]" },
  sm: { tile: "size-10 rounded-lg", icon: "size-5" },
  md: { tile: "size-12 rounded-xl", icon: "size-[1.625rem]" },
  lg: { tile: "size-16 rounded-xl", icon: "size-8" },
} as const;

/** File-type icon on a grey tile. */
export function KindTile({
  kind,
  size = "sm",
  className,
}: {
  kind: FileKind;
  size?: keyof typeof TILE_SIZES;
  className?: string;
}) {
  const sizes = TILE_SIZES[size];
  return (
    <span className={cn("grid shrink-0 place-items-center", sizes.tile, KIND_GRADIENT_CLASSES[kind], className)}>
      <FileTypeIcon kind={kind} className={sizes.icon} />
    </span>
  );
}
