"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Icon, type IconName } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export interface MenuAction {
  id: string;
  label: string;
  icon: IconName;
  onSelect: () => void;
  tone?: "danger";
  disabled?: boolean;
}

interface ActionMenuProps {
  /** Accessible name of the trigger, for example "Actions for shot.png". */
  label: string;
  /** Title shown at the top of the phone action sheet. */
  title: string;
  actions: MenuAction[];
  triggerClassName?: string;
  triggerIcon?: ReactNode;
}

const DESKTOP_QUERY = "(min-width: 640px)";

/**
 * Overflow menu. On larger screens it opens as a small popover under the button; on phones it
 * opens as an action sheet from the bottom, like a native app. Keyboard: arrows move, Escape closes.
 */
export function ActionMenu({ label, title, actions, triggerClassName, triggerIcon }: ActionMenuProps) {
  const [mode, setMode] = useState<null | "popover" | "sheet">(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  function open() {
    setMode(window.matchMedia(DESKTOP_QUERY).matches ? "popover" : "sheet");
  }

  function close(returnFocus = true) {
    setMode(null);
    if (returnFocus) triggerRef.current?.focus();
  }

  function select(action: MenuAction) {
    close(false);
    action.onSelect();
  }

  // Popover: focus the first item, and close on outside click.
  useEffect(() => {
    if (mode !== "popover") return;
    menuRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]:not(:disabled)")?.focus();
    function onPointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setMode(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [mode]);

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not(:disabled)") ?? []);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items.at(-1)?.focus();
    } else if (event.key === "Tab") {
      setMode(null);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={mode !== null}
        aria-controls={mode === "popover" ? menuId : undefined}
        onClick={(event) => {
          // Cards are links; keep the menu button from opening the item.
          event.preventDefault();
          event.stopPropagation();
          if (mode) close();
          else open();
        }}
        className={cn(
          "grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-foreground",
          triggerClassName,
        )}
      >
        {triggerIcon ?? <Icon name="more" />}
      </button>

      {mode === "popover" ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={title}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-full z-30 mt-1.5 w-52 animate-pop-in rounded-2xl border border-border bg-surface p-1.5 shadow-float"
        >
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              disabled={action.disabled}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                select(action);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium outline-none transition-colors focus-visible:bg-surface-muted disabled:opacity-50",
                action.tone === "danger" ? "text-danger hover:bg-danger-soft" : "text-foreground hover:bg-surface-muted",
              )}
            >
              <Icon name={action.icon} className="size-[1.125rem]" />
              {action.label}
            </button>
          ))}
        </div>
      ) : null}

      <Dialog open={mode === "sheet"} onClose={() => close()} title={title}>
        <ul className="-mx-2 -mt-2 space-y-1">
          {actions.map((action) => (
            <li key={action.id}>
              <button
                type="button"
                disabled={action.disabled}
                onClick={() => select(action)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-2xl px-3 py-3.5 text-left text-base font-medium transition-colors active:bg-surface-muted disabled:opacity-50",
                  action.tone === "danger" ? "text-danger" : "text-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid size-10 place-items-center rounded-full",
                    action.tone === "danger" ? "bg-danger-soft" : "bg-surface-muted",
                  )}
                >
                  <Icon name={action.icon} />
                </span>
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
    </div>
  );
}
