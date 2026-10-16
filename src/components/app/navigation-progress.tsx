"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

// Stops the bar if a navigation never completes (for example, a failed request).
const GIVE_UP_AFTER_MS = 10_000;

function currentKey(pathname: string, search: string): string {
  return `${pathname}?${new URLSearchParams(search).toString()}`;
}

/**
 * A thin bar across the top while the next page loads after a link click.
 * It clears itself when the address changes, so it needs no extra state from the pages.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The address the user is leaving. While it still matches, the page has not changed yet.
  const [leavingKey, setLeavingKey] = useState<string | null>(null);

  const key = currentKey(pathname, searchParams.toString());
  const loading = leavingKey !== null && leavingKey === key;

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      if (target.target && target.target !== "_self") return;
      if (target.hasAttribute("download")) return;

      const destination = new URL(target.href);
      if (destination.origin !== window.location.origin) return;
      // Same page (or only a #anchor change): nothing will load.
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;

      setLeavingKey(currentKey(window.location.pathname, window.location.search));
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (leavingKey === null) return;
    const timer = window.setTimeout(() => setLeavingKey(null), GIVE_UP_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [leavingKey]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px] overflow-hidden transition-opacity duration-300",
        loading ? "opacity-100" : "opacity-0",
      )}
    >
      <div className={cn("h-full w-full origin-left bg-foreground", loading && "animate-progress")} />
    </div>
  );
}
