import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { buildLibraryHref, type LibraryState } from "@/lib/files/query";

interface PaginationProps {
  state: LibraryState;
  pageCount: number;
}

export function Pagination({ state, pageCount }: PaginationProps) {
  if (pageCount <= 1) return null;
  const page = state.query.page;
  const previous = page > 1 ? buildLibraryHref(state, { page: page - 1 }) : null;
  const next = page < pageCount ? buildLibraryHref(state, { page: page + 1 }) : null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-3 pt-2">
      {previous ? (
        <Link href={previous} aria-label="Previous page" className={buttonClasses({ variant: "secondary", size: "icon" })}>
          <Icon name="back" />
        </Link>
      ) : (
        <span aria-hidden="true" className={buttonClasses({ variant: "secondary", size: "icon", className: "opacity-40" })}>
          <Icon name="back" />
        </span>
      )}
      <span className="min-w-24 text-center text-sm font-medium text-muted">
        Page {page} of {pageCount}
      </span>
      {next ? (
        <Link href={next} aria-label="Next page" className={buttonClasses({ variant: "secondary", size: "icon" })}>
          <Icon name="chevronRight" />
        </Link>
      ) : (
        <span aria-hidden="true" className={buttonClasses({ variant: "secondary", size: "icon", className: "opacity-40" })}>
          <Icon name="chevronRight" />
        </span>
      )}
    </nav>
  );
}
