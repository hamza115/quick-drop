"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { FileItem } from "@/lib/files/constants";

interface SelectionContextValue {
  selecting: boolean;
  /** Selected items by id. Kept across pages, so a selection can span several pages. */
  selected: ReadonlyMap<string, FileItem>;
  isSelected: (id: string) => boolean;
  toggle: (item: FileItem) => void;
  /** Enters selection mode, optionally selecting a first item (long-press on phones). */
  start: (first?: FileItem) => void;
  selectAll: (items: FileItem[]) => void;
  clear: () => void;
  stop: () => void;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function LibrarySelectionProvider({ children }: { children: ReactNode }) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlyMap<string, FileItem>>(new Map());

  const toggle = useCallback((item: FileItem) => {
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, item);
      return next;
    });
  }, []);

  const start = useCallback((first?: FileItem) => {
    setSelecting(true);
    if (first) setSelected((current) => new Map(current).set(first.id, first));
  }, []);

  const selectAll = useCallback((items: FileItem[]) => {
    setSelected((current) => {
      const next = new Map(current);
      for (const item of items) next.set(item.id, item);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Map()), []);

  const stop = useCallback(() => {
    setSelecting(false);
    setSelected(new Map());
  }, []);

  const value = useMemo<SelectionContextValue>(
    () => ({
      selecting,
      selected,
      isSelected: (id: string) => selected.has(id),
      toggle,
      start,
      selectAll,
      clear,
      stop,
    }),
    [selecting, selected, toggle, start, selectAll, clear, stop],
  );

  return <SelectionContext value={value}>{children}</SelectionContext>;
}

export function useSelection(): SelectionContextValue {
  const context = useContext(SelectionContext);
  if (!context) throw new Error("useSelection must be used inside LibrarySelectionProvider");
  return context;
}
