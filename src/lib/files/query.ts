import type { ZodType } from "zod";
import type { SortOption, ViewMode } from "@/lib/files/constants";
import { listQuerySchema, type ListQuery } from "@/lib/files/validation";

/** The user's saved defaults. URLs leave out values equal to these. */
export interface LibraryDefaults {
  sort: SortOption;
  view: ViewMode;
}

// The design's catalog is a card grid, so grid is the default view.
export const BASE_LIBRARY_DEFAULTS: LibraryDefaults = { sort: "newest", view: "grid" };

export interface LibraryState {
  query: ListQuery;
  view: ViewMode;
  /** Missing means the built-in defaults (newest, grid). */
  defaults?: LibraryDefaults;
}

type RawParams = Record<string, string | string[] | undefined>;

/** Reads library filters from the URL. Invalid values fall back to defaults instead of erroring. */
export function parseLibraryParams(raw: RawParams, defaults: LibraryDefaults = BASE_LIBRARY_DEFAULTS): ListQuery {
  // Check each parameter on its own, so one bad value does not reset the others.
  const fieldSchemas: Record<string, ZodType> = listQuerySchema.shape;
  const valid: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first === undefined || !(key in fieldSchemas)) continue;
    if (fieldSchemas[key].safeParse(first).success) valid[key] = first;
  }
  valid.sort ??= defaults.sort;
  return listQuerySchema.parse(valid);
}

export function parseViewMode(raw: RawParams, defaultView: ViewMode = BASE_LIBRARY_DEFAULTS.view): ViewMode {
  const value = Array.isArray(raw.view) ? raw.view[0] : raw.view;
  return value === "list" || value === "grid" ? value : defaultView;
}

/** Builds a library URL, omitting parameters that have their default value. */
export function buildLibraryHref(
  state: LibraryState,
  changes: Partial<ListQuery> & { view?: ViewMode },
): string {
  const { view: nextView = state.view, ...queryChanges } = changes;
  const next = { ...state.query, ...queryChanges };
  const defaults = state.defaults ?? BASE_LIBRARY_DEFAULTS;

  const params = new URLSearchParams();
  if (next.type !== "all") params.set("type", next.type);
  if (next.favorites) params.set("favorites", "1");
  if (next.q) params.set("q", next.q);
  if (next.sort !== defaults.sort) params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  if (nextView !== defaults.view) params.set("view", nextView);

  const queryString = params.toString();
  return queryString ? `/?${queryString}` : "/";
}
