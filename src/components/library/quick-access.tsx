import Link from "next/link";
import { FileTypeIcon } from "@/components/library/file-type-icon";
import { Icon } from "@/components/ui/icons";
import { RelativeTime } from "@/components/ui/relative-time";
import { KIND_LABELS, type FileItem } from "@/lib/files/constants";

/** Cards for the newest items. Swipe sideways on phones; a row of six on wide screens. */
export function QuickAccess({ items }: { items: FileItem[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="quick-access-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="quick-access-heading" className="text-item text-foreground">
          Quick Access
        </h2>
        <span className="text-caption text-muted">Recently added</span>
      </div>

      <ul className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 scrollbar-none lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0 xl:grid-cols-6">
        {items.map((item) => (
          <li key={item.id} className="w-[9.5rem] shrink-0 snap-start sm:w-44 lg:w-auto">
            <Link
              href={`/files/${item.id}`}
              aria-label={`${item.displayName}, ${KIND_LABELS[item.kind]}`}
              className="group relative flex h-32 flex-col justify-between rounded-card bg-surface p-3.5 shadow-card transition-colors hover:bg-surface-muted"
            >
              {item.thumbnailUrl ? (
                // Signed thumbnail through QuickDrop.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.thumbnailUrl} alt="" loading="lazy" decoding="async" className="size-8 rounded-lg bg-surface-container object-cover" />
              ) : (
                <span className="grid size-8 place-items-center rounded-lg bg-surface-container text-foreground">
                  <FileTypeIcon kind={item.kind} className="size-[18px]" />
                </span>
              )}
              {item.isFavorite ? <Icon name="star" filled className="absolute right-3 top-3 size-4 text-foreground" /> : null}
              <span className="min-w-0">
                <span className="block truncate text-item text-foreground">{item.displayName}</span>
                <RelativeTime iso={item.createdAt} className="mt-0.5 block truncate text-caption text-muted" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
