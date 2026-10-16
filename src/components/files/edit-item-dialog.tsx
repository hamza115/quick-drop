"use client";

import { textareaClasses } from "@/components/ui/field-styles";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { apiRequest, ApiError } from "@/lib/api/client";
import type { FileItem } from "@/lib/files/constants";
import { updateItemSchema } from "@/lib/files/validation";

interface EditItemDialogProps {
  item: FileItem;
  open: boolean;
  onClose: () => void;
}

export function EditItemDialog({ item, open, onClose }: EditItemDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Edit details" description="Changes the title, text and tags. The saved item itself stays the same.">
      <EditItemForm item={item} onDone={onClose} />
    </Dialog>
  );
}

function EditItemForm({ item, onDone }: { item: FileItem; onDone: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const textLabel = item.kind === "note" ? "Text" : "Note";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = String(form.get("note") ?? "");

    if (item.kind === "note" && text.trim() === "") {
      setFieldErrors({ note: "A note needs some text. Delete it instead once deleting is available." });
      return;
    }

    const tags = String(form.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const parsed = updateItemSchema.safeParse({
      displayName: String(form.get("displayName") ?? ""),
      note: text,
      tags,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSaving(true);
    try {
      await apiRequest<{ item: FileItem }>(`/api/files/${item.id}`, { method: "PATCH", body: parsed.data });
      toast.show("Changes saved.");
      router.refresh();
      onDone();
    } catch (error) {
      setSaving(false);
      setFormError(error instanceof ApiError ? error.message : "Couldn't save changes. Try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <TextField
        name="displayName"
        label="Title"
        defaultValue={item.displayName}
        autoFocus
        error={fieldErrors.displayName}
        disabled={saving}
      />

      <div className="space-y-1.5">
        <label htmlFor="edit-note" className="block text-sm font-medium text-foreground">
          {textLabel}
        </label>
        <textarea
          id="edit-note"
          name="note"
          rows={4}
          defaultValue={item.note ?? ""}
          disabled={saving}
          aria-invalid={fieldErrors.note ? true : undefined}
          aria-describedby={fieldErrors.note ? "edit-note-error" : undefined}
          className={textareaClasses}
        />
        {fieldErrors.note ? (
          <p id="edit-note-error" className="text-sm text-danger">
            {fieldErrors.note}
          </p>
        ) : null}
      </div>

      <TextField
        name="tags"
        label="Tags"
        defaultValue={item.tags.join(", ")}
        hint="Separate tags with commas."
        error={fieldErrors.tags}
        disabled={saving}
      />

      {formError ? (
        <div role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger">
          {formError}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onDone} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
