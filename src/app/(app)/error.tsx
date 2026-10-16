"use client"; // Error boundaries must be Client Components.

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonClasses } from "@/components/ui/button";

/** Shown when a library page fails to load. Never shows raw error details. */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("[app] page failed:", error.digest ?? error.name);
  }, [error]);

  return (
    <section
      aria-labelledby="app-error-title"
      className="mx-5 my-10 max-w-lg rounded-card bg-surface px-6 py-12 text-center shadow-card sm:mx-auto"
    >
      <h1 id="app-error-title" className="text-lg font-semibold text-foreground">
        This page didn&apos;t load
      </h1>
      <p className="mt-2 text-sm text-muted">
        Something went wrong while loading your files. Your saved items are not affected. Try again, or go back to
        the library.
      </p>
      {error.digest ? <p className="mt-2 text-xs text-muted">Reference: {error.digest}</p> : null}
      <div className="mt-6 flex justify-center gap-2">
        <Button onClick={() => retry()}>Try again</Button>
        <Link href="/" className={buttonClasses({ variant: "secondary" })}>
          Back to library
        </Link>
      </div>
    </section>
  );
}
