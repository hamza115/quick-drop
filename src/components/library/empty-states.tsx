import Link from "next/link";
import { AddItemButton } from "@/components/library/add-item-button";
import { buttonClasses } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icons";
import { UploadButton } from "@/components/uploads/upload-button";

function EmptyIllustration({ icon }: { icon: IconName }) {
  return (
    <div aria-hidden="true" className="relative mx-auto mb-5 size-24">
      <div className="absolute inset-0 rotate-[8deg] rounded-[1.6rem] bg-linear-to-b from-kind-image-soft to-kind-image-soft-2" />
      <div className="absolute inset-0 -rotate-[4deg] rounded-[1.6rem] bg-linear-to-b from-kind-document-soft to-kind-document-soft-2" />
      <div className="absolute inset-0 grid place-items-center rounded-[1.6rem] border border-border bg-surface text-foreground shadow-raised">
        <Icon name={icon} className="size-10" />
      </div>
    </div>
  );
}

export function EmptyLibrary() {
  return (
    <section
      aria-labelledby="empty-library-title"
      className="rounded-card border-[1.5px] border-dashed border-border-strong px-6 py-14 text-center"
    >
      <EmptyIllustration icon="cloud" />
      <h2 id="empty-library-title" className="text-lg font-semibold tracking-tight text-foreground">
        Your shelf is empty
      </h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
        Upload files, drop them anywhere, or paste a screenshot or link. They&apos;ll be here on every device you
        sign in on.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <UploadButton label="Upload files" />
        <AddItemButton label="Save a link or note" />
      </div>
    </section>
  );
}

export function NoResults() {
  return (
    <section
      aria-labelledby="no-results-title"
      className="rounded-card border-[1.5px] border-dashed border-border-strong px-6 py-14 text-center"
    >
      <EmptyIllustration icon="search" />
      <h2 id="no-results-title" className="text-lg font-semibold tracking-tight text-foreground">
        Nothing matches
      </h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
        Try a different search term, or clear the filters to see everything.
      </p>
      <Link href="/" className={buttonClasses({ variant: "secondary", className: "mt-6" })}>
        Clear filters
      </Link>
    </section>
  );
}
