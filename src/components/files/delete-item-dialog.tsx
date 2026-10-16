"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { apiRequest, ApiError } from "@/lib/api/client";
import type { FileItem } from "@/lib/files/constants";

interface DeleteItemDialogProps {
  item: FileItem;
  open: boolean;
  onClose: () => void;
  /** Runs after a successful delete. Defaults to going back to the library. */
  onDeleted?: () => void;
}

export function DeleteItemDialog({ item, open, onClose, onDeleted }: DeleteItemDialogProps) {
  const hasStoredFile = item.secureUrl !== null;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Delete “${item.displayName}”?`}
      description={
        hasStoredFile
          ? "The file is removed from storage and from your library. This can't be undone."
          : "It's removed from your library. This can't be undone."
      }
    >
      <DeleteForm item={item} onCancel={onClose} onDeleted={onDeleted} />
    </Dialog>
  );
}

type Failure = { message: string; partial: boolean };

function DeleteForm({
  item,
  onCancel,
  onDeleted,
}: {
  item: FileItem;
  onCancel: () => void;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  function finish() {
    if (onDeleted) {
      onDeleted();
    } else {
      router.replace("/");
    }
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    setFailure(null);
    try {
      await apiRequest<{ ok: true }>(`/api/files/${item.id}`, { method: "DELETE" });
      toast.show("Deleted.");
      finish();
    } catch (error) {
      setDeleting(false);
      if (error instanceof ApiError && error.status === 404) {
        // Already gone, for example deleted from another device.
        toast.show("This item was already deleted.");
        finish();
        return;
      }
      setFailure({
        message: error instanceof ApiError ? error.message : "Couldn't delete. Try again.",
        partial: error instanceof ApiError && error.code === "delete_partial",
      });
    }
  }

  return (
    <div className="space-y-5">
      {failure ? (
        <div role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger">
          <p className="font-medium">{failure.partial ? "Delete only partly finished" : "Couldn't delete"}</p>
          <p className="mt-1">{failure.message}</p>
        </div>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" size="lg" className="sm:h-10 sm:px-4 sm:text-sm" onClick={onCancel} disabled={deleting}>
          Cancel
        </Button>
        <Button type="button" variant="danger" size="lg" className="sm:h-10 sm:px-4 sm:text-sm" onClick={handleDelete} loading={deleting}>
          {deleting ? "Deleting…" : failure ? "Try again" : "Delete"}
        </Button>
      </div>
    </div>
  );
}
