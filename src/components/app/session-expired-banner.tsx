"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SESSION_EXPIRED_EVENT } from "@/lib/api/client";

/**
 * Shown when an API call reports that the session ended. Signing in happens in a new tab,
 * so this page, and any queued uploads, stay as they are.
 */
export function SessionExpiredBanner() {
  const router = useRouter();
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    function onExpired() {
      setExpired(true);
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  if (!expired) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[70] mx-auto flex max-w-xl flex-wrap items-center gap-3 rounded-card border border-warning bg-surface px-4 py-3 text-sm shadow-lg"
    >
      <p className="min-w-0 flex-1 text-foreground">
        Your session ended. Sign in again to keep working. Queued uploads are kept on this page.
      </p>
      <a
        href="/login"
        target="_blank"
        rel="noopener"
        className="inline-flex h-8 items-center rounded-control bg-accent px-3 font-medium text-accent-foreground hover:bg-accent-hover"
      >
        Sign in<span className="sr-only"> (opens in a new tab)</span>
      </a>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setExpired(false);
          router.refresh();
        }}
      >
        I&apos;ve signed in
      </Button>
    </div>
  );
}
