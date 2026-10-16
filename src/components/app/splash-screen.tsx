"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/cn";

/** Set once the splash has shown in this tab. The head script reads it before the first paint. */
export const SPLASH_SEEN_KEY = "quickdrop.splash.seen";

// Keep the splash up long enough to read, even on a fast connection.
const MIN_SHOW_MS = 700;
const FADE_MS = 300;

/**
 * Full-screen splash for phones only. It stays until the page has loaded, then fades out.
 * Desktop never shows it (md:hidden), and a repeat visit in the same tab skips it (see the head script).
 */
export function SplashScreen() {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const started = performance.now();
    const timers: number[] = [];
    let cancelled = false;

    function finish() {
      if (cancelled) return;
      const wait = Math.max(0, MIN_SHOW_MS - (performance.now() - started));
      timers.push(
        window.setTimeout(() => {
          setLeaving(true);
          try {
            sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
          } catch {
            // Private browsing can block storage. The splash then shows once more, which is harmless.
          }
          timers.push(window.setTimeout(() => setGone(true), FADE_MS));
        }, wait),
      );
    }

    if (document.readyState === "complete") {
      timers.push(window.setTimeout(finish, 0));
    } else {
      window.addEventListener("load", finish, { once: true });
    }

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("load", finish);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      id="splash-screen"
      aria-hidden="true"
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background pb-safe pt-safe transition-opacity duration-300 ease-out motion-reduce:transition-none md:hidden",
        leaving ? "pointer-events-none opacity-0" : "opacity-100",
      )}
    >
      <div className="flex flex-col items-center gap-8">
        <div className="motion-safe:animate-[splash-rise_600ms_cubic-bezier(0.22,1,0.36,1)_both]">
          <Logo size="lg" />
        </div>
        <div className="skeleton h-[3px] w-24 rounded-full" />
      </div>
    </div>
  );
}
