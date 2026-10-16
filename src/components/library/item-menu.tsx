"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteItemDialog } from "@/components/files/delete-item-dialog";
import { EditItemDialog } from "@/components/files/edit-item-dialog";
import { useItemActions } from "@/components/files/use-item-actions";
import { ActionMenu, type MenuAction } from "@/components/ui/action-menu";
import type { FileItem } from "@/lib/files/constants";

/** The "⋯" menu on library cards and rows: the same actions as the file page, without opening it. */
export function ItemMenu({ item, triggerClassName }: { item: FileItem; triggerClassName?: string }) {
  const router = useRouter();
  const actions = useItemActions(item);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const menu: MenuAction[] = [
    { id: "open", label: "Open", icon: "open", onSelect: () => router.push(`/files/${item.id}`) },
    ...(actions.canCopyImage
      ? [{ id: "copy-image", label: "Copy image", icon: "image" as const, onSelect: () => void actions.copyImage() }]
      : []),
    ...(actions.copyTarget
      ? [{ id: "copy", label: actions.copyTarget.label, icon: "copy" as const, onSelect: () => void actions.copy() }]
      : []),
    ...(actions.canDownload
      ? [{ id: "download", label: "Download", icon: "download" as const, onSelect: () => void actions.download() }]
      : []),
    {
      id: "favorite",
      label: item.isFavorite ? "Remove from favorites" : "Add to favorites",
      icon: "star",
      onSelect: () => void actions.toggleFavorite(),
    },
    { id: "edit", label: "Edit details", icon: "edit", onSelect: () => setEditing(true) },
    { id: "delete", label: "Delete", icon: "trash", tone: "danger", onSelect: () => setDeleting(true) },
  ];

  return (
    <>
      <ActionMenu label={`Actions for ${item.displayName}`} title={item.displayName} actions={menu} triggerClassName={triggerClassName} />
      <EditItemDialog item={item} open={editing} onClose={() => setEditing(false)} />
      <DeleteItemDialog item={item} open={deleting} onClose={() => setDeleting(false)} onDeleted={() => setDeleting(false)} />
    </>
  );
}
