"use client";

import Link from "next/link";
import { KindTile } from "@/components/library/file-type-icon";
import { ItemMenu } from "@/components/library/item-menu";
import { useSelection } from "@/components/library/selection";
import { useLongPress } from "@/components/library/use-long-press";
import { Icon } from "@/components/ui/icons";
import { RelativeTime } from "@/components/ui/relative-time";
import { cn } from "@/lib/cn";
import { percentSaved } from "@/lib/compression/plan";
import { KIND_LABELS, type FileItem } from "@/lib/files/constants";
import { formatBytes, hostnameOf } from "@/lib/files/format";

/**
 * Table columns, shared by the header and every row so they line up.
 * Phones: name + menu only (a native-style list). md: + modified, size, type. xl: + tags.
 */
export const FILE_TABLE_COLUMNS =
  "grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.5fr)_5.5rem_6.5rem_2.5rem] xl:grid-cols-[minmax(0,2.4fr)_minmax(0,1.4fr)_5.5rem_6.5rem_minmax(0,1.3fr)_2.5rem]";

function sizeOf(item: FileItem): string | null {
  if (item.kind === "link" || item.kind === "note") return null;
  return formatBytes(item.storedSizeBytes ?? item.originalSizeBytes);
}

/** Second line under "Last modified": what kind of save it was. */
function modifiedDetail(item: FileItem): string {
  if (item.kind === "link") return hostnameOf(item.linkUrl ?? "");
  if (item.kind === "note") return "Note";
  if (item.compression) {
    const saved = percentSaved(item.compression.originalBytes, item.storedSizeBytes ?? item.originalSizeBytes);
    return `Compressed · ${saved}% smaller`;
  }
  return "Uploaded";
}

export function FileTableHeader() {
  return (
    <div
      aria-hidden="true"
      className={cn(FILE_TABLE_COLUMNS, "hidden gap-4 border-b border-border px-4 py-3 text-caption font-medium text-muted md:grid")}
    >
      <span>Name</span>
      <span>Last modified</span>
      <span>Size</span>
      <span>Type</span>
      <span className="hidden xl:block">Tags</span>
      <span />
    </div>
  );
}

/** One row of the files table (a list cell on phones). */
export function FileRow({ item }: { item: FileItem }) {
  const { selecting, isSelected, toggle, start } = useSelection();
  const selected = isSelected(item.id);
  const longPress = useLongPress(() => (selecting ? toggle(item) : start(item)));
  const size = sizeOf(item);

  return (
    <li
      className={cn(
        FILE_TABLE_COLUMNS,
        "relative items-center gap-3 px-3 py-3 transition-colors md:gap-4 md:px-4",
        selected ? "bg-surface-container" : "hover:bg-surface-muted",
      )}
    >
      {/* Name */}
      <div className="flex min-w-0 items-center gap-3">
        {selecting ? (
          <span
            aria-hidden="true"
            className={cn(
              "grid size-5 shrink-0 place-items-center rounded-md border-[1.5px] transition-colors",
              selected ? "border-foreground bg-foreground text-surface" : "border-border-strong bg-surface",
            )}
          >
            {selected ? <Icon name="check" className="size-3" /> : null}
          </span>
        ) : null}

        {item.thumbnailUrl ? (
          // Signed thumbnail through QuickDrop.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-11 shrink-0 rounded-lg bg-surface-container object-cover md:size-8"
          />
        ) : (
          <KindTile kind={item.kind} className="size-11 rounded-lg md:size-8" />
        )}

        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-item text-foreground">{item.displayName}</span>
            {item.isFavorite ? (
              <span className="shrink-0 text-foreground">
                <Icon name="star" filled className="size-3.5" />
                <span className="sr-only">Favorite</span>
              </span>
            ) : null}
          </p>
          {/* Phone meta line; on larger screens the columns carry this. */}
          <p className="mt-0.5 truncate text-caption text-muted md:hidden">
            {KIND_LABELS[item.kind]}
            {size ? ` · ${size}` : ""}
            <span aria-hidden="true"> · </span>
            <RelativeTime iso={item.createdAt} />
          </p>
        </div>
      </div>

      {/* Last modified */}
      <div className="hidden min-w-0 text-body md:block">
        <RelativeTime iso={item.updatedAt} className="block truncate text-foreground" />
        <span className="block truncate text-caption text-muted">{modifiedDetail(item)}</span>
      </div>

      {/* Size */}
      <div className="hidden text-body text-foreground md:block">{size ?? <span className="text-subtle">—</span>}</div>

      {/* Type */}
      <div className="hidden md:block">
        <span className="inline-flex items-center rounded bg-surface-container px-2 py-0.5 font-mono text-[11px] uppercase text-muted">
          {KIND_LABELS[item.kind]}
        </span>
      </div>

      {/* Tags */}
      <div className="hidden min-w-0 flex-wrap gap-1 xl:flex">
        {item.tags.length > 0 ? (
          item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="inline-flex h-[1.375rem] max-w-full items-center truncate rounded bg-surface-muted px-2 text-[11px] text-muted">
              #{tag}
            </span>
          ))
        ) : (
          <span className="text-xs text-subtle">—</span>
        )}
      </div>

      {/* Whole-row control: opens the item, or toggles it while selecting. */}
      {selecting ? (
        <button
          type="button"
          aria-pressed={selected}
          aria-label={`${selected ? "Deselect" : "Select"} ${item.displayName}`}
          onClick={() => toggle(item)}
          className="absolute inset-0"
        />
      ) : (
        <Link
          href={`/files/${item.id}`}
          aria-label={`${item.displayName}, ${KIND_LABELS[item.kind]}`}
          className="absolute inset-0 [-webkit-touch-callout:none]"
          {...longPress}
        />
      )}

      {/* Menu */}
      <div className="relative z-10 justify-self-end">
        {selecting ? <span className="block size-9" aria-hidden="true" /> : <ItemMenu item={item} />}
      </div>
    </li>
  );
}
