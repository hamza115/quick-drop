"use client";

import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Wider panel on large screens, for forms with more fields. */
  wide?: boolean;
}

/**
 * Native <dialog>: focus trap, Escape to close and inert background come from the browser.
 * Phones get a bottom sheet with a grab handle; larger screens get a centred card.
 * Tapping the dimmed backdrop closes it.
 */
export function Dialog({ open, onClose, title, description, children, wide = false }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    // Clicks on the backdrop land on the <dialog> element itself, outside the panel.
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        "max-h-[92dvh] overflow-hidden bg-transparent p-0 text-foreground",
        // Phone: full-width sheet pinned to the bottom.
        "mt-auto mb-0 w-full max-w-none",
        // Tablet and up: centred card.
        "sm:m-auto sm:w-[min(calc(100%-2rem),30rem)]",
        wide && "sm:w-[min(calc(100%-2rem),40rem)]",
      )}
    >
      {/* Children mount only while open, so each opening starts with a fresh form. */}
      {open ? (
        <div
          className={cn(
            "flex max-h-[92dvh] flex-col overflow-hidden border border-border bg-surface shadow-float",
            "animate-sheet-up rounded-t-sheet pb-safe sm:animate-pop-in sm:rounded-sheet sm:pb-0",
          )}
        >
          <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border-strong sm:hidden" aria-hidden="true" />
          <header className="flex shrink-0 items-start gap-3 px-6 pt-4 sm:pt-6">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-lg font-semibold tracking-tight">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-1 text-sm text-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              <Icon name="close" />
            </button>
          </header>
          <div className="min-h-0 overflow-y-auto px-6 pb-6 pt-5">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
