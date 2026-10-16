"use client";

import { FileCard } from "@/components/library/file-card";
import { FileRow, FileTableHeader } from "@/components/library/file-row";
import { SelectionBar } from "@/components/library/selection-bar";
import type { FileItem, ViewMode } from "@/lib/files/constants";

/** The files table (list view) or card grid, with selection support. */
export function LibraryItems({ items, view }: { items: FileItem[]; view: ViewMode }) {
  return (
    <>
      {view === "grid" ? (
        <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <FileCard key={item.id} item={item} />
          ))}
        </ul>
      ) : (
        <div className="overflow-hidden rounded-card bg-surface shadow-card">
          <FileTableHeader />
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <FileRow key={item.id} item={item} />
            ))}
          </ul>
        </div>
      )}
      <SelectionBar pageItems={items} />
    </>
  );
}
