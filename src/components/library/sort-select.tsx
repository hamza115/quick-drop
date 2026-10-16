"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { SORT_OPTIONS, type SortOption } from "@/lib/files/constants";
import { buildLibraryHref, type LibraryState } from "@/lib/files/query";

const SORT_TEXT: Record<SortOption, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  name: "Name (A–Z)",
  largest: "Largest first",
};

/** "Sort: Newest first" pill. A native select underneath, so it works with keyboards and phones. */
export function SortSelect({ state }: { state: LibraryState }) {
  const router = useRouter();

  return (
    <label className="relative flex h-8 items-center gap-1 rounded-lg bg-surface-muted pl-3 pr-7 text-caption text-foreground transition-colors hover:bg-surface-container">
      <span className="text-muted">Sort:</span>
      <span className="text-[13px] font-semibold">{SORT_TEXT[state.query.sort]}</span>
      <Icon name="chevronDown" className="pointer-events-none absolute right-2 size-4" />
      <select
        aria-label="Sort by"
        value={state.query.sort}
        onChange={(event) =>
          router.push(buildLibraryHref(state, { sort: event.target.value as SortOption, page: 1 }))
        }
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {SORT_TEXT[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
