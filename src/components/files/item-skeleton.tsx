import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";

/** Placeholder for a file's detail page: preview on the left, actions and details on the right. */
export function ItemSkeleton() {
  return (
    <LoadingRegion label="Loading file" className="mx-auto max-w-5xl space-y-6">
      <Skeleton className="h-4 w-32" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-80 w-full rounded-card" />
        </div>
        <aside className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-11 w-full rounded-full" />
            <Skeleton className="h-11 w-full rounded-full" />
            <Skeleton className="h-11 w-full rounded-full" />
          </div>
          <div className="space-y-3 rounded-card bg-surface p-4 shadow-card">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </aside>
      </div>
    </LoadingRegion>
  );
}
