import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A grey placeholder block with a soft moving highlight. Decorative, so hidden from screen readers. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton", className)} />;
}

/** Wraps a skeleton layout so screen readers announce "Loading" once instead of reading every block. */
export function LoadingRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}
