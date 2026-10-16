export const FILE_KINDS = ["image", "video", "document", "archive", "other", "link", "note"] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export const KIND_LABELS: Record<FileKind, string> = {
  image: "Image",
  video: "Video",
  document: "Document",
  archive: "Archive",
  other: "File",
  link: "Link",
  note: "Note",
};

export const TYPE_FILTERS = ["all", "image", "video", "document", "links"] as const;
export type TypeFilter = (typeof TYPE_FILTERS)[number];

export const TYPE_FILTER_LABELS: Record<TypeFilter, string> = {
  all: "All files",
  image: "Images",
  video: "Videos",
  document: "Documents",
  links: "Links & notes",
};

/** Which stored kinds each type filter includes. */
export const TYPE_FILTER_KINDS: Record<Exclude<TypeFilter, "all">, FileKind[]> = {
  image: ["image"],
  video: ["video"],
  document: ["document"],
  links: ["link", "note"],
};

export const SORT_OPTIONS = ["newest", "oldest", "name", "largest"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  oldest: "Oldest",
  name: "Name (A–Z)",
  largest: "Largest",
};

export const VIEW_MODES = ["grid", "list"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const PAGE_SIZE = 24;

/** How an uploaded file was processed before upload. Sizes are in bytes. */
export interface FileCompression {
  originalName: string;
  originalBytes: number;
  /** Format of the stored file, for example "image/webp". */
  outputType: string;
}

/** The item shape sent to the browser. Never includes other owners' data or internal fields. */
export interface FileItem {
  id: string;
  kind: FileKind;
  displayName: string;
  originalName: string | null;
  mimeType: string | null;
  originalSizeBytes: number;
  storedSizeBytes: number | null;
  linkUrl: string | null;
  /** Note text for notes, or a comment for links. */
  note: string | null;
  tags: string[];
  isFavorite: boolean;
  /**
   * QuickDrop URL that opens the file (/api/files/<id>/content). It checks the session and owner,
   * then redirects to a signed Cloudinary URL. Null for links and notes.
   */
  secureUrl: string | null;
  /** QuickDrop URL for a small preview (/api/files/<id>/thumbnail). Images and videos only. */
  thumbnailUrl: string | null;
  resourceType: string | null;
  /** Set when the browser compressed the file before upload. */
  compression: FileCompression | null;
  createdAt: string;
  updatedAt: string;
}
