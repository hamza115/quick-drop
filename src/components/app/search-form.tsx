"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/icons";
import { LIMITS } from "@/lib/files/validation";
import { cn } from "@/lib/cn";

/**
 * Plain GET form, so search works even before JavaScript loads.
 * ⌘K / Ctrl+K, or "/" outside a text field, jumps to it.
 */
export function SearchForm({ autoFocus = false, className }: { autoFocus?: boolean; className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const input = inputRef.current;
      if (!input || input.offsetParent === null) return; // hidden at this screen size
      const commandK = event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);
      const slash = event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (!commandK && !slash) return;
      const target = event.target as HTMLElement | null;
      if (slash && target?.closest("input, textarea, select, [contenteditable=true]")) return;
      event.preventDefault();
      input.focus();
      input.select();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const id = autoFocus ? "library-search-mobile" : "library-search";

  return (
    <form
      role="search"
      action="/"
      method="get"
      className={cn(
        "flex w-full items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-muted transition-[box-shadow,background-color] focus-within:bg-surface focus-within:ring-2 focus-within:ring-foreground/15",
        className,
      )}
    >
      <label htmlFor={id} className="sr-only">
        Search files, links and notes
      </label>
      <Icon name="search" className="size-[18px]" />
      <input
        ref={inputRef}
        id={id}
        name="q"
        type="search"
        enterKeyHint="search"
        maxLength={LIMITS.search}
        placeholder="Search files, links, notes…"
        autoComplete="off"
        autoFocus={autoFocus}
        className="w-full min-w-0 bg-transparent text-base text-foreground outline-none placeholder:text-muted sm:text-body"
      />
      <kbd className="hidden shrink-0 rounded bg-surface-highest px-1.5 py-0.5 font-sans text-[11px] text-muted lg:block">⌘K</kbd>
    </form>
  );
}
