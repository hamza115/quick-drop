"use client";

import { useSyncExternalStore } from "react";
import { formatDate, formatRelativeTime } from "@/lib/files/format";

function subscribe(onChange: () => void): () => void {
  const id = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(id);
}

/** Current minute; changes once a minute so the text stays fresh. */
function currentMinute(): number {
  return Math.floor(Date.now() / 60_000);
}

function serverMinute(): null {
  return null;
}

/**
 * "2 min ago", "Yesterday 2:20 pm"… in the viewer's own time zone. The server render (and
 * hydration) shows the plain date, then the browser switches to the relative text.
 */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  const minute = useSyncExternalStore(subscribe, currentMinute, serverMinute);
  const text = minute === null ? formatDate(iso) : formatRelativeTime(iso, new Date(minute * 60_000));
  return (
    <time dateTime={iso} title={minute === null ? undefined : new Date(iso).toLocaleString()} className={className}>
      {text}
    </time>
  );
}
