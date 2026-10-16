import { LibrarySkeleton } from "@/components/library/library-skeleton";

// Shown while a page in the signed-in area loads. Pages with their own loading.tsx override this.
export default function Loading() {
  return <LibrarySkeleton />;
}
