"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";

/** How far the finger must pull (after resistance) before letting go refreshes. */
const TRIGGER_PX = 70;
/** The indicator never travels further than this. */
const MAX_PULL_PX = 110;
/** Finger movement is damped so the pull feels elastic. */
const RESISTANCE = 0.5;
/** Coming back to the app refreshes only if the last refresh is older than this. */
const RETURN_REFRESH_AFTER_MS = 15_000;

/** True when the touch started on something that handles its own drags or scrolls. */
function startsInsideScroller(target: EventTarget | null): boolean {
  let element = target instanceof Element ? target : null;
  if (element?.closest("[data-no-pull], dialog[open], input, textarea, select, video, [contenteditable=true]")) return true;
  while (element && element !== document.body) {
    if (element.scrollTop > 0) return true; // An inner list that is not at its top scrolls first.
    element = element.parentElement;
  }
  return false;
}

/**
 * Phones: pull down at the top of the page to fetch the latest library from the server.
 * All screens: coming back to the tab or app refreshes, so changes made on another device show up.
 * Uses router.refresh(), so the page is not reloaded and running uploads keep going.
 */
export function PullToRefresh() {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const lastRefresh = useRef(0);

  // Pull to refresh. The page sets overscroll-behavior: none, so the browser's own version is off.
  useEffect(() => {
    let startY: number | null = null;
    let current = 0;

    function refresh() {
      lastRefresh.current = Date.now();
      startRefresh(() => router.refresh());
    }

    function onTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1 || window.scrollY > 0 || startsInsideScroller(event.target)) {
        startY = null;
        return;
      }
      startY = event.touches[0].clientY;
      current = 0;
    }

    function onTouchMove(event: TouchEvent) {
      if (startY === null) return;
      if (event.touches.length !== 1) {
        startY = null;
        current = 0;
        setPull(0);
        setDragging(false);
        return;
      }
      const delta = event.touches[0].clientY - startY;
      if (delta <= 0 || window.scrollY > 0) {
        // Scrolling up into the page, not pulling.
        if (current > 0) {
          current = 0;
          setPull(0);
          setDragging(false);
        }
        return;
      }
      event.preventDefault(); // Keeps the page still while the indicator follows the finger.
      current = Math.min(MAX_PULL_PX, delta * RESISTANCE);
      setPull(current);
      setDragging(true);
    }

    function onTouchEnd() {
      if (startY === null) return;
      startY = null;
      if (current >= TRIGGER_PX) refresh();
      current = 0;
      setPull(0);
      setDragging(false);
    }

    // Not passive: touchmove must be able to call preventDefault while pulling.
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [router]);

  // Refresh when the user comes back to the tab or the app.
  useEffect(() => {
    lastRefresh.current = Date.now();

    function onReturn() {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastRefresh.current < RETURN_REFRESH_AFTER_MS) return;
      lastRefresh.current = Date.now();
      startRefresh(() => router.refresh());
    }

    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    return () => {
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [router]);

  // While refreshing, the indicator rests just below the app bar.
  const offset = refreshing && !dragging ? TRIGGER_PX * 0.8 : pull;
  const visible = offset > 0;
  const ready = pull >= TRIGGER_PX;

  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+3.5rem)] z-30 flex justify-center lg:top-16",
          !dragging && "transition-transform duration-200 ease-out motion-reduce:transition-none",
        )}
        style={{ transform: `translateY(${visible ? offset - 44 : -56}px)` }}
      >
        <div
          className={cn(
            "grid size-9 place-items-center rounded-full bg-surface text-foreground shadow-raised ring-1 ring-border transition-opacity duration-150",
            visible ? "opacity-100" : "opacity-0",
          )}
        >
          <svg
            className={cn("size-5", refreshing && !dragging && "animate-spin motion-reduce:animate-none")}
            style={refreshing && !dragging ? undefined : { transform: `rotate(${(pull / TRIGGER_PX) * 270}deg)` }}
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
            <path
              d="M21 12a9 9 0 0 0-9-9"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeOpacity={ready || refreshing ? 1 : 0.6}
            />
          </svg>
        </div>
      </div>
      <span role="status" className="sr-only">
        {refreshing ? "Refreshing" : ""}
      </span>
    </>
  );
}
