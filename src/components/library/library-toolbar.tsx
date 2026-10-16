import Link from "next/link";
import { SelectToggle } from "@/components/library/select-toggle";
import { SortSelect } from "@/components/library/sort-select";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { TYPE_FILTERS, type TypeFilter } from "@/lib/files/constants";
import { buildLibraryHref, type LibraryState } from "@/lib/files/query";

interface LibraryToolbarProps {
  state: LibraryState;
  total: number;
  /** Item counts per chip, shown as "Images (48)". */
  counts?: Record<TypeFilter, number>;
}

const CHIP_LABELS: Record<TypeFilter, string> = {
  all: "All",
  image: "Images",
  video: "Videos",
  document: "Documents",
  links: "Links & Notes",
};

/** Filter chips, view switch, sort and Select, as in the design's control toolbar. */
export function LibraryToolbar({ state, total, counts }: LibraryToolbarProps) {
  return (
    <div className="flex flex-col justify-between gap-3 pt-1 sm:flex-row sm:items-center">
      {/* Chips scroll sideways on phones. */}
      <nav aria-label="Filter by type" className="-mx-5 overflow-x-auto px-5 scrollbar-none sm:mx-0 sm:px-0">
        <ul className="flex w-max items-center gap-1">
          {TYPE_FILTERS.map((filter) => {
            const active = state.query.type === filter && !state.query.favorites;
            const count = counts?.[filter];
            return (
              <li key={filter}>
                <Link
                  href={buildLibraryHref(state, { type: filter, favorites: false, page: 1 })}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-item transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-muted text-muted hover:bg-surface-container hover:text-foreground",
                  )}
                >
                  {CHIP_LABELS[filter]}
                  {count !== undefined ? ` (${count})` : ""}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <div role="group" aria-label="View" className="flex items-center rounded-lg bg-surface-muted p-0.5">
          {(["grid", "list"] as const).map((view) => {
            const active = state.view === view;
            return (
              <Link
                key={view}
                href={buildLibraryHref(state, { view })}
                aria-current={active ? "true" : undefined}
                aria-label={view === "grid" ? "Grid view" : "List view"}
                title={view === "grid" ? "Grid view" : "List view"}
                className={cn(
                  "grid size-7 place-items-center rounded transition-colors",
                  active ? "bg-surface text-foreground shadow-soft" : "text-muted hover:text-foreground",
                )}
              >
                <Icon name={view} className="size-[18px]" />
              </Link>
            );
          })}
        </div>
        <SortSelect state={state} />
        <SelectToggle disabled={total === 0} />
      </div>
    </div>
  );
}
