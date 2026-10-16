"use client";

import { Icon } from "@/components/ui/icons";
import { useEffect, useState } from "react";
import { useUploads } from "@/components/uploads/upload-provider";

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function hasType(event: DragEvent | ClipboardEvent, wanted: string[]): boolean {
  const types = Array.from(event instanceof DragEvent ? (event.dataTransfer?.types ?? []) : []);
  return wanted.some((type) => types.includes(type));
}

/**
 * Makes the whole app accept drops and pastes: files upload, links and text are saved.
 * Typing fields are left alone, so normal editing still works.
 */
export function GlobalDropPaste() {
  const { intake } = useUploads();
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let depth = 0;
    const fileTypes = ["Files"];
    const textTypes = ["text/uri-list", "text/plain"];

    function onDragEnter(event: DragEvent) {
      if (!hasType(event, fileTypes)) return;
      depth += 1;
      setDragging(true);
    }

    function onDragLeave(event: DragEvent) {
      if (!hasType(event, fileTypes)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    }

    function onDragOver(event: DragEvent) {
      if (hasType(event, [...fileTypes, ...textTypes])) event.preventDefault();
    }

    function onDrop(event: DragEvent) {
      depth = 0;
      setDragging(false);
      if (isEditable(event.target)) return;
      if (!hasType(event, [...fileTypes, ...textTypes]) || !event.dataTransfer) return;
      event.preventDefault();
      intake(event.dataTransfer);
    }

    function onPaste(event: ClipboardEvent) {
      if (isEditable(event.target) || !event.clipboardData) return;
      if (intake(event.clipboardData)) event.preventDefault();
    }

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("paste", onPaste);
    };
  }, [intake]);

  if (!dragging) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[55] animate-fade-in bg-background/70 p-4 backdrop-blur-sm">
      <div className="grid size-full place-items-center rounded-sheet border-2 border-dashed border-foreground/60 bg-surface/80">
        <div className="flex animate-pop-in flex-col items-center gap-3 text-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-float">
            <Icon name="upload" className="size-8" />
          </span>
          <p className="text-lg font-semibold text-foreground">Drop to add to QuickDrop</p>
          <p className="text-sm text-muted">Files upload; links and text are saved.</p>
        </div>
      </div>
    </div>
  );
}
