import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmptyLibrary, NoResults } from "@/components/library/empty-states";
import { LibraryItems } from "@/components/library/library-items";
import { LibraryToolbar } from "@/components/library/library-toolbar";
import { Pagination } from "@/components/library/pagination";
import { QuickAccess } from "@/components/library/quick-access";
import { LibrarySelectionProvider } from "@/components/library/selection";
import { PasteZone } from "@/components/uploads/paste-zone";
import { getCurrentSession } from "@/lib/auth/session";
import { TYPE_FILTER_LABELS } from "@/lib/files/constants";
import { parseLibraryParams, parseViewMode } from "@/lib/files/query";
import { getLibraryStats, listFiles } from "@/lib/files/repository";
import { listQuerySchema } from "@/lib/files/validation";
import { getPreferences } from "@/lib/preferences/repository";

export const metadata: Metadata = {
  title: "Library",
};

// Reads search params and the session, so block on the server (see the layout).
export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LibraryPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const ownerId = session.user.id;

  const [raw, preferences] = await Promise.all([searchParams, getPreferences(ownerId)]);
  const defaults = { sort: preferences.defaultSort, view: preferences.defaultView };
  const state = { query: parseLibraryParams(raw, defaults), view: parseViewMode(raw, defaults.view), defaults };
  const { query, view } = state;
  const isFiltered = query.q !== "" || query.type !== "all" || query.favorites;
  const isHome = query.page === 1 && !isFiltered;

  const [result, stats, recent] = await Promise.all([
    listFiles(ownerId, query),
    // Item counts for the filter chips.
    getLibraryStats(ownerId),
    // Quick Access (the six newest items) appears on the home view only.
    isHome ? listFiles(ownerId, listQuerySchema.parse({ sort: "newest", pageSize: 6 })) : Promise.resolve(null),
  ]);

  const heading = query.q
    ? `Results for “${query.q}”`
    : query.favorites
      ? "Favorites"
      : TYPE_FILTER_LABELS[query.type];

  return (
    <LibrarySelectionProvider>
      {isHome ? <PasteZone /> : null}
      {recent && recent.total > 0 ? <QuickAccess items={recent.items} /> : null}

      <section aria-labelledby="files-heading" className="flex flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <h1 id="files-heading" className="min-w-0 truncate text-title text-foreground">
            {heading}
          </h1>
          <span className="shrink-0 text-caption text-muted">
            {result.total} {result.total === 1 ? "item" : "items"}
          </span>
        </div>
        <LibraryToolbar state={state} total={result.total} counts={stats.countsByFilter} />

        {result.items.length === 0 ? (
          isFiltered ? <NoResults /> : <EmptyLibrary />
        ) : (
          <LibraryItems items={result.items} view={view} />
        )}

        <Pagination state={state} pageCount={result.pageCount} />
      </section>
    </LibrarySelectionProvider>
  );
}
