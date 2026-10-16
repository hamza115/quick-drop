"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { apiRequest, ApiError } from "@/lib/api/client";
import type { FileItem } from "@/lib/files/constants";
import type { UpdateItemInput } from "@/lib/files/validation";

/** Saves inline edits (title, tags, note, favorite) and refreshes the page data. */
export function useItemUpdate(itemId: string) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (changes: UpdateItemInput): Promise<FileItem | null> => {
      setSaving(true);
      try {
        const { item } = await apiRequest<{ item: FileItem }>(`/api/files/${itemId}`, { method: "PATCH", body: changes });
        router.refresh();
        return item;
      } catch (error) {
        toast.show(error instanceof ApiError ? error.message : "Couldn't save the change. Try again.", "error");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [itemId, router, toast],
  );

  return { save, saving };
}
