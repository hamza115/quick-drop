"use client";

import type { ClipboardEvent, FormEvent, KeyboardEvent } from "react";
import { UploadButton } from "@/components/uploads/upload-button";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { useUploads } from "@/components/uploads/upload-provider";

/**
 * A focusable paste area. On a phone, press and hold it and choose Paste; on a computer,
 * click it and press Ctrl or Cmd+V. It accepts only pastes, so typed text is ignored.
 */
export function PasteZone() {
  const { intake } = useUploads();
  const toast = useToast();

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!event.clipboardData || !intake(event.clipboardData)) {
      toast.show("Nothing to save in the clipboard. Copy an image, file or link first.", "error");
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const isShortcut = event.ctrlKey || event.metaKey;
    // Let Ctrl/Cmd shortcuts through so paste still works. Block typing and Enter.
    if (event.key === "Enter" || (event.key.length === 1 && !isShortcut)) {
      event.preventDefault();
    }
  }

  function handleInput(event: FormEvent<HTMLDivElement>) {
    // Clears anything typed through an on-screen keyboard that bypassed keydown.
    event.currentTarget.textContent = "";
  }

  return (
    <div className="group relative rounded-card bg-surface p-5 shadow-card transition-[background-color,box-shadow] duration-200 hover:bg-surface-muted focus-within:ring-2 focus-within:ring-foreground/15">
      <div className="flex flex-col items-center justify-between gap-3 text-center md:flex-row md:text-left">
        <div className="flex flex-col items-center gap-3 md:flex-row">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-container text-foreground transition-transform group-hover:scale-105 motion-reduce:group-hover:scale-100">
            <Icon name="cloudUpload" className="size-[26px]" />
          </span>
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <span className="text-item text-foreground">
                <span className="hidden md:inline">Drop files anywhere to upload instantly</span>
                <span className="md:hidden">Press and hold here to paste</span>
              </span>
              <span className="hidden rounded bg-live-soft px-2 py-0.5 text-[11px] font-semibold text-live-ink sm:inline-block">Ready</span>
            </div>
            <span className="text-caption text-muted">
              <span className="hidden md:inline">Private, signed uploads • Paste with ⌘V / Ctrl+V • Photos, videos, PDFs, documents, links</span>
              <span className="md:hidden">Screenshots, files and links • Private, signed uploads</span>
            </span>
          </div>
        </div>
        {/* Above the paste overlay, so it stays clickable. */}
        <div className="relative z-10">
          <UploadButton variant="secondary" size="sm" label="Browse files" icon="folderOpen" />
        </div>
      </div>
      <div
        role="textbox"
        aria-label="Paste area: paste screenshots, files or links"
        aria-multiline="false"
        tabIndex={0}
        contentEditable
        suppressContentEditableWarning
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        className="absolute inset-0 cursor-text rounded-card outline-none"
      />
    </div>
  );
}
