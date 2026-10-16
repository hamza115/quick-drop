"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type PointerEvent } from "react";
import { FileTypeIcon } from "@/components/library/file-type-icon";
import { buttonClasses } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { percentSaved } from "@/lib/compression/plan";
import { KIND_LABELS, type FileItem } from "@/lib/files/constants";
import { formatBytes, hostnameOf } from "@/lib/files/format";
import { parseWebUrl } from "@/lib/files/validation";

export interface MediaSize {
  width: number;
  height: number;
}

interface MediaStageProps {
  item: FileItem;
  previousHref: string | null;
  nextHref: string | null;
  /** Reports the real pixel size once an image or video has loaded. */
  onMeasure: (size: MediaSize) => void;
  size: MediaSize | null;
  /** Null for non-PDF files. For PDFs, false means the file can't be delivered right now. */
  pdfAvailable: boolean | null;
}

const ZOOM_STEPS = [50, 75, 100, 125, 150, 200, 300];

/** Only QuickDrop's own owner-checked routes are used as media sources. */
function privateFileUrl(item: FileItem): string | null {
  return item.secureUrl && item.secureUrl.startsWith(`/api/files/${item.id}/`) ? item.secureUrl : null;
}

const HUD = "bg-surface/90 shadow-[0_2px_12px_rgb(0_0_0/0.08)] backdrop-blur-md";

/**
 * The left "stage" of the file screen: the media centred on a soft well, a floating zoom strip
 * (images), fullscreen, previous/next arrows, and a utility bar with format, size and compression.
 */
export function MediaStage({ item, previousHref, nextHref, onMeasure, size, pdfAvailable }: MediaStageProps) {
  const stageRef = useRef<HTMLElement>(null);
  const [zoom, setZoom] = useState(100);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const fileUrl = privateFileUrl(item);
  const isImage = item.kind === "image" && fileUrl !== null;

  const setZoomLevel = useCallback((next: number) => {
    setZoom(next);
    if (next <= 100) setOffset({ x: 0, y: 0 }); // nothing to pan at fit size
  }, []);

  function zoomBy(direction: 1 | -1) {
    const index = ZOOM_STEPS.indexOf(zoom);
    const next = ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, (index === -1 ? 2 : index) + direction))];
    setZoomLevel(next);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stageRef.current?.requestFullscreen();
    } catch {
      // Some browsers (iPhone Safari) don't allow fullscreen for elements; nothing to do.
    }
  }

  // Drag to pan when zoomed in.
  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (zoom <= 100) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: offset.x, y: offset.y, startX: event.clientX, startY: event.clientY };
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setOffset({
      x: drag.current.x + event.clientX - drag.current.startX,
      y: drag.current.y + event.clientY - drag.current.startY,
    });
  }
  function onPointerUp() {
    drag.current = null;
  }

  const stored = item.storedSizeBytes ?? item.originalSizeBytes;
  const savedPercent = item.compression ? percentSaved(item.compression.originalBytes, stored) : null;

  return (
    <section
      ref={stageRef}
      aria-label={`${KIND_LABELS[item.kind]} preview`}
      className="relative flex min-h-[52dvh] flex-1 flex-col justify-between overflow-hidden bg-surface-highest/60 select-none xl:min-h-0 [&:fullscreen]:bg-background"
    >
      {/* Top HUD */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-center justify-between gap-2 lg:inset-x-4 lg:top-4">
        {isImage ? (
          <div className={cn("pointer-events-auto flex items-center gap-1 rounded-full px-1.5 py-1", HUD)}>
            <button type="button" onClick={() => zoomBy(-1)} disabled={zoom <= ZOOM_STEPS[0]} aria-label="Zoom out" className="grid size-7 place-items-center rounded-full text-foreground hover:bg-surface-container disabled:opacity-40">
              <Icon name="minus" className="size-[18px]" />
            </button>
            <button type="button" onClick={() => setZoomLevel(100)} aria-label="Reset zoom" className="rounded-full px-2 py-0.5 font-mono text-caption text-foreground hover:bg-surface-container">
              {zoom}%
            </button>
            <button type="button" onClick={() => zoomBy(1)} disabled={zoom >= ZOOM_STEPS.at(-1)!} aria-label="Zoom in" className="grid size-7 place-items-center rounded-full text-foreground hover:bg-surface-container disabled:opacity-40">
              <Icon name="plus" className="size-[18px]" />
            </button>
            <span className="mx-0.5 h-3 w-px bg-surface-highest" aria-hidden="true" />
            <button type="button" onClick={() => setZoomLevel(100)} aria-label="Fit to screen" title="Fit to screen" className="grid size-7 place-items-center rounded-full text-foreground hover:bg-surface-container">
              <Icon name="fit" className="size-[18px]" />
            </button>
          </div>
        ) : (
          <span />
        )}

        <div className="pointer-events-auto flex items-center gap-1.5">
          {size ? (
            <span className={cn("hidden items-center gap-1.5 rounded-full px-3 py-1 sm:flex", HUD)}>
              <span className="size-2 rounded-full bg-live motion-safe:animate-pulse" aria-hidden="true" />
              <span className="font-mono text-caption text-foreground">
                {size.width} × {size.height}
              </span>
            </span>
          ) : null}
          <button type="button" onClick={toggleFullscreen} aria-label="Toggle fullscreen" title="Fullscreen" className={cn("grid size-8 place-items-center rounded-full text-foreground hover:bg-surface-container", HUD)}>
            <Icon name="expand" className="size-4" />
          </button>
        </div>
      </div>

      {/* Stage */}
      <div
        className={cn(
          "relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-5 pt-16 lg:px-10 lg:pb-6 lg:pt-16",
          isImage && zoom > 100 && "cursor-grab active:cursor-grabbing",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Soft glow behind the media. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="size-[28rem] rounded-full bg-surface-high/50 opacity-70 blur-3xl" />
        </div>

        <div
          // Fills the stage, so media can size itself to the window with max-h-full on wide screens.
          className="relative flex max-h-full max-w-full items-center justify-center transition-transform duration-200 ease-out motion-reduce:transition-none xl:size-full"
          style={isImage ? { transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom / 100})` } : undefined}
        >
          <StageContent item={item} fileUrl={fileUrl} onMeasure={onMeasure} pdfAvailable={pdfAvailable} />
        </div>

        {previousHref ? (
          <Link href={previousHref} aria-label="Previous file" title="Previous (←)" className="absolute left-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-surface/80 text-foreground shadow-raised backdrop-blur transition-transform hover:scale-105 hover:bg-surface sm:grid lg:left-4">
            <Icon name="back" className="size-6" />
          </Link>
        ) : null}
        {nextHref ? (
          <Link href={nextHref} aria-label="Next file" title="Next (→)" className="absolute right-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-surface/80 text-foreground shadow-raised backdrop-blur transition-transform hover:scale-105 hover:bg-surface sm:grid lg:right-4">
            <Icon name="chevronRight" className="size-6" />
          </Link>
        ) : null}
      </div>

      {/* Utility bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-surface/90 px-4 py-2 text-caption text-muted backdrop-blur-md lg:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1.5">
            <FileTypeIcon kind={item.kind} className="size-4 text-foreground" />
            <span className="text-item text-foreground">{stageLabel(item)}</span>
          </span>
          {size ? (
            <>
              <span className="text-secondary" aria-hidden="true">•</span>
              <span>
                {size.width} × {size.height} pixels
              </span>
            </>
          ) : null}
          {item.kind !== "link" && item.kind !== "note" ? (
            <>
              <span className="text-secondary" aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1 text-foreground">
                <Icon name="check" className="size-3.5 text-live-strong" />
                {savedPercent !== null ? `Compressed · ${savedPercent}% smaller` : `Original file · ${formatBytes(stored)}`}
              </span>
            </>
          ) : null}
        </div>
        {fileUrl ? (
          <a href={fileUrl} target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-foreground">
            <Icon name="open" className="size-3.5" />
            Open in tab
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
      </div>
    </section>
  );
}

function stageLabel(item: FileItem): string {
  if (item.kind === "image") return "True ratio preview";
  if (item.kind === "video") return "Video";
  if (item.mimeType === "application/pdf") return "PDF";
  if (item.kind === "link") return "Link";
  if (item.kind === "note") return "Note";
  return KIND_LABELS[item.kind];
}

function StageContent({
  item,
  fileUrl,
  onMeasure,
  pdfAvailable,
}: {
  item: FileItem;
  fileUrl: string | null;
  onMeasure: (size: MediaSize) => void;
  pdfAvailable: boolean | null;
}) {
  if (item.kind === "image" && fileUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fileUrl}
        alt={item.displayName}
        decoding="async"
        draggable={false}
        onLoad={(event) => onMeasure({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        className="max-h-[68dvh] max-w-full rounded-lg object-contain shadow-float xl:max-h-full"
      />
    );
  }

  if (item.kind === "video" && fileUrl) {
    return (
      // Standard controls only. Nothing plays until the viewer presses play.
      <video
        src={fileUrl}
        controls
        playsInline
        preload="metadata"
        aria-label={item.displayName}
        onLoadedMetadata={(event) => onMeasure({ width: event.currentTarget.videoWidth, height: event.currentTarget.videoHeight })}
        className="max-h-[68dvh] w-full max-w-4xl rounded-lg bg-black shadow-float xl:max-h-full"
      />
    );
  }

  if (item.mimeType === "application/pdf" && pdfAvailable === false) {
    // Cloudinary refuses this PDF, so a preview frame would only show a blank page.
    return (
      <div role="status" className="flex max-w-md flex-col items-center gap-3 rounded-card bg-surface p-8 text-center shadow-float">
        <Icon name="alert" className="size-8 text-muted" />
        <p className="text-item text-foreground">This PDF can&apos;t be previewed right now.</p>
        <p className="text-caption text-muted">
          Cloudinary isn&apos;t delivering PDF files for this account. Allow PDF delivery in Cloudinary&apos;s security
          settings, then reload this page.
        </p>
      </div>
    );
  }

  if (item.mimeType === "application/pdf" && fileUrl) {
    return (
      <>
        {/* Desktop browsers show PDFs inline; phones open them in their own viewer instead. */}
        <iframe src={fileUrl} title={`${item.displayName} (PDF)`} className="hidden h-[70dvh] w-[min(56rem,100%)] rounded-lg bg-surface shadow-float sm:block xl:h-full" />
        <a href={fileUrl} target="_blank" rel="noopener" className={buttonClasses({ size: "lg", className: "sm:hidden" })}>
          <Icon name="open" className="size-[18px]" />
          Open PDF
        </a>
      </>
    );
  }

  if (item.kind === "note") {
    return (
      <div className="max-h-[60dvh] w-[min(40rem,100%)] overflow-y-auto rounded-card bg-surface p-6 shadow-float">
        <p className="whitespace-pre-wrap break-words text-body text-foreground">{item.note}</p>
      </div>
    );
  }

  if (item.kind === "link") {
    const safeUrl = item.linkUrl ? (parseWebUrl(item.linkUrl)?.href ?? null) : null;
    return (
      <div className="flex w-[min(30rem,100%)] flex-col items-center gap-4 rounded-card bg-surface p-8 text-center shadow-float">
        <span className="grid size-14 place-items-center rounded-xl bg-surface-container text-foreground">
          <Icon name="link" className="size-7" />
        </span>
        <div className="min-w-0">
          <p className="text-title text-foreground">{hostnameOf(item.linkUrl ?? "")}</p>
          <p className="mt-1 break-all text-caption text-muted">{item.linkUrl}</p>
        </div>
        {safeUrl ? (
          <a href={safeUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses()}>
            <Icon name="open" className="size-[18px]" />
            Open link
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <p className="text-caption text-danger">This link can&apos;t be opened.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-card bg-surface p-10 text-center shadow-float">
      <span className="grid size-16 place-items-center rounded-xl bg-surface-container text-foreground">
        <FileTypeIcon kind={item.kind} className="size-8" />
      </span>
      <p className="text-item text-foreground">{KIND_LABELS[item.kind]}</p>
      <p className="text-caption text-muted">This type has no preview here. Open or download it.</p>
    </div>
  );
}
