"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FileInspector } from "@/components/files/file-inspector";
import { MediaStage, type MediaSize } from "@/components/files/media-stage";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { FileItem, FileKind } from "@/lib/files/constants";
import type { FileNeighbors } from "@/lib/files/repository";

/** Library section each kind belongs to, for the breadcrumb. */
const SECTION: Record<FileKind, { label: string; href: string }> = {
  image: { label: "Images", href: "/?type=image" },
  video: { label: "Videos", href: "/?type=video" },
  document: { label: "Documents", href: "/?type=document" },
  link: { label: "Links & Notes", href: "/?type=links" },
  note: { label: "Links & Notes", href: "/?type=links" },
  archive: { label: "All Files", href: "/" },
  other: { label: "All Files", href: "/" },
};

const ROUND_BUTTON = "grid size-8 place-items-center rounded-full text-foreground transition-colors hover:bg-surface-high";

/**
 * The file screen (design-preview/file-preview.html): a context bar with breadcrumb and
 * previous/next, the media stage on the left, and the inspector on the right.
 * ← and → move between files; Esc goes back to the library.
 */
export function FileViewer({
  item,
  neighbors,
  pdfAvailable,
}: {
  item: FileItem;
  neighbors: FileNeighbors | null;
  /** Null for non-PDF files. For PDFs, false means Cloudinary is refusing to deliver it. */
  pdfAvailable: boolean | null;
}) {
  const router = useRouter();
  const [measured, setMeasured] = useState<{ id: string; size: MediaSize } | null>(null);
  const size = measured?.id === item.id ? measured.size : null;
  const previousHref = neighbors?.previousId ? `/files/${neighbors.previousId}` : null;
  const nextHref = neighbors?.nextId ? `/files/${neighbors.nextId}` : null;
  const section = SECTION[item.kind];

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true], video")) return;
      if (document.querySelector("dialog[open]")) return;
      if (event.key === "ArrowLeft" && previousHref) router.push(previousHref);
      else if (event.key === "ArrowRight" && nextHref) router.push(nextHref);
      else if (event.key === "Escape") router.push("/");
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, previousHref, nextHref]);

  return (
    <div className="flex flex-col">
      {/* Context bar. Sticks under the top bar on wide screens (fixed 3.5rem height, used below). */}
      <div className="flex items-center justify-between gap-3 bg-surface-muted px-4 py-2.5 lg:h-14 lg:px-10 lg:py-0 xl:sticky xl:top-16 xl:z-30">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-1 text-item text-muted transition-colors hover:text-foreground">
            <Icon name="back" className="size-[18px]" />
            <span className="hidden sm:inline">Back to Library</span>
            <span className="sm:hidden">Library</span>
          </Link>
          <span className="hidden size-1 shrink-0 rounded-full bg-border-strong md:block" aria-hidden="true" />
          <nav aria-label="Breadcrumb" className="hidden min-w-0 md:block">
            <ol className="flex min-w-0 items-center gap-1 text-caption text-muted">
              <li>
                <Link href="/" className="hover:text-foreground">
                  Library
                </Link>
              </li>
              <li aria-hidden="true">
                <Icon name="chevronRight" className="size-3.5" />
              </li>
              <li>
                <Link href={section.href} className="text-item text-foreground hover:underline">
                  {section.label}
                </Link>
              </li>
              <li aria-hidden="true">
                <Icon name="chevronRight" className="size-3.5" />
              </li>
              <li aria-current="page" className="min-w-0 truncate text-foreground">
                {item.displayName}
              </li>
            </ol>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {neighbors ? (
            <span className="font-mono text-caption text-muted">
              {neighbors.position} of {neighbors.total}
            </span>
          ) : null}
          <div className="flex items-center gap-0.5">
            {previousHref ? (
              <Link href={previousHref} aria-label="Previous file" title="Previous file (←)" className={ROUND_BUTTON}>
                <Icon name="back" className="size-5" />
              </Link>
            ) : (
              <span aria-hidden="true" className={cn(ROUND_BUTTON, "opacity-30 hover:bg-transparent")}>
                <Icon name="back" className="size-5" />
              </span>
            )}
            {nextHref ? (
              <Link href={nextHref} aria-label="Next file" title="Next file (→)" className={ROUND_BUTTON}>
                <Icon name="chevronRight" className="size-5" />
              </Link>
            ) : (
              <span aria-hidden="true" className={cn(ROUND_BUTTON, "opacity-30 hover:bg-transparent")}>
                <Icon name="chevronRight" className="size-5" />
              </span>
            )}
          </div>
          <span className="mx-0.5 hidden h-4 w-px bg-surface-highest sm:block" aria-hidden="true" />
          <Link href="/" aria-label="Close preview" title="Close (Esc)" className={cn(ROUND_BUTTON, "hidden text-muted hover:text-foreground sm:grid")}>
            <Icon name="close" className="size-5" />
          </Link>
        </div>
      </div>

      {/*
        Stage + inspector. Side by side from 1280px with a fixed-width inspector, so its text never
        gets squeezed; stacked below that. Side by side, the stage is sticky and exactly fills the
        window under the top bar (4rem) and context bar (3.5rem); only the inspector scrolls.
      */}
      <div className="grid w-full grid-cols-1 items-start xl:grid-cols-[minmax(0,1fr)_24rem] 2xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="flex flex-col xl:sticky xl:top-[7.5rem] xl:h-[calc(100dvh-7.5rem)]">
          <MediaStage
            item={item}
            previousHref={previousHref}
            nextHref={nextHref}
            size={size}
            pdfAvailable={pdfAvailable}
            onMeasure={(next) => setMeasured({ id: item.id, size: next })}
          />
        </div>
        <div className="flex min-h-full flex-col xl:min-h-[calc(100dvh-7.5rem)]">
          <FileInspector item={item} size={size} />
        </div>
      </div>
    </div>
  );
}
