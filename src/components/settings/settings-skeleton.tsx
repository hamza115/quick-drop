import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";

/** Placeholder for the settings page: a profile card and a few groups of setting rows. */
export function SettingsSkeleton() {
  return (
    <LoadingRegion label="Loading settings" className="mx-auto max-w-4xl space-y-6">
      <Skeleton className="h-6 w-32" />
      <div className="flex items-center gap-4 rounded-card bg-surface p-5 shadow-card">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      {Array.from({ length: 3 }, (_, group) => (
        <div key={group} className="space-y-3 rounded-card bg-surface p-5 shadow-card">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 3 }, (_, row) => (
            <div key={row} className="flex items-center justify-between gap-4 py-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-72 max-w-[60vw]" />
              </div>
              <Skeleton className="h-10 w-36 rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </LoadingRegion>
  );
}
