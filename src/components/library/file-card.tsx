"use client";

import Link from "next/link";
import { useItemActions } from "@/components/files/use-item-actions";
import { FileTypeIcon } from "@/components/library/file-type-icon";
import { ItemMenu } from "@/components/library/item-menu";
import { useSelection } from "@/components/library/selection";
import { useLongPress } from "@/components/library/use-long-press";
import { Icon } from "@/components/ui/icons";
import { RelativeTime } from "@/components/ui/relative-time";
import { cn } from "@/lib/cn";
import { percentSaved } from "@/lib/compression/plan";
import { KIND_LABELS, type FileItem } from "@/lib/files/constants";
import { formatBytes, hostnameOf } from "@/lib/files/format";

/** Second line under the name: what this item is. */
function subtitleOf(item: FileItem): string {
  if (item.kind === "link") return hostnameOf(item.linkUrl ?? "");
  if (item.kind === "note") return item.note?.split("\n").find((line) => line.trim())?.trim() ?? "Note";
  if (item.compression) {
    const saved = percentSaved(item.compression.originalBytes, item.storedSizeBytes ?? item.originalSizeBytes);
    return `${KIND_LABELS[item.kind]} · ${saved}% smaller`;
  }
  return KIND_LABELS[item.kind];
}

function footerSize(item: FileItem): string {
  if (item.kind === "link") return "Bookmark";
  if (item.kind === "note") return "Note";
  return formatBytes(item.storedSizeBytes ?? item.originalSizeBytes);
}

/** Catalog card from the design. The whole card opens the item (or toggles it while selecting). */
export function FileCard({ item }: { item: FileItem }) {
  const { selecting, isSelected, toggle, start } = useSelection();
  const selected = isSelected(item.id);
  const longPress = useLongPress(() => (selecting ? toggle(item) : start(item)));
  const actions = useItemActions(item);

  return (
    <li
      className={cn(
        "group relative flex min-h-[9.5rem] flex-col justify-between rounded-card bg-surface p-3 shadow-card transition-colors hover:bg-surface-muted",
        selected && "bg-surface-muted ring-2 ring-foreground",
      )}
    >
      <div className="flex items-start justify-between">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnailUrl} alt="" loading="lazy" decoding="async" className="size-8 rounded-lg bg-surface-container object-cover" />
        ) : (
          <span className="grid size-8 place-items-center rounded-lg bg-surface-container text-foreground">
            <FileTypeIcon kind={item.kind} className="size-[18px]" />
          </span>
        )}

        {selecting ? (
          <span
            aria-hidden="true"
            className={cn(
              "grid size-5 place-items-center rounded-full border-[1.5px] transition-colors",
              selected ? "border-foreground bg-foreground text-surface" : "border-border-strong bg-surface",
            )}
          >
            {selected ? <Icon name="check" className="size-3" /> : null}
          </span>
        ) : (
          // Above the card link, so these stay clickable.
          <div className="relative z-10 -mr-1 -mt-1 flex items-center">
            <button
              type="button"
              onClick={() => void actions.toggleFavorite()}
              disabled={actions.busy === "favorite"}
              aria-pressed={item.isFavorite}
              aria-label={item.isFavorite ? `Remove ${item.displayName} from favorites` : `Add ${item.displayName} to favorites`}
              className={cn(
                "grid size-8 place-items-center rounded-md transition-colors hover:text-foreground disabled:opacity-50",
                item.isFavorite ? "text-foreground" : "text-muted",
              )}
            >
              <Icon name="star" filled={item.isFavorite} className="size-[18px]" />
            </button>
            <ItemMenu item={item} triggerClassName="size-8 rounded-md" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col py-3">
        <span className="truncate text-item text-foreground">{item.displayName}</span>
        <span className="truncate text-caption text-muted">{subtitleOf(item)}</span>
      </div>

      <div className="flex items-center justify-between pt-0.5 text-caption text-muted">
        <span>{footerSize(item)}</span>
        <RelativeTime iso={item.createdAt} />
      </div>

      {/* Stretched control covering the card. */}
      {selecting ? (
        <button
          type="button"
          aria-pressed={selected}
          aria-label={`${selected ? "Deselect" : "Select"} ${item.displayName}`}
          onClick={() => toggle(item)}
          className="absolute inset-0 rounded-card"
        />
      ) : (
        <Link
          href={`/files/${item.id}`}
          aria-label={`${item.displayName}, ${KIND_LABELS[item.kind]}`}
          className="absolute inset-0 rounded-card [-webkit-touch-callout:none]"
          {...longPress}
        />
      )}
    </li>
  );
}
