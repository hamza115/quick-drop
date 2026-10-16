"use client";

import { textareaClasses } from "@/components/ui/field-styles";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icons";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { apiRequest, ApiError } from "@/lib/api/client";
import { createItemSchema } from "@/lib/files/validation";
import { cn } from "@/lib/cn";
import type { FileItem } from "@/lib/files/constants";

type Mode = "link" | "note";

export function AddItemButton({
  label = "Add link",
  size = "md",
  className,
}: {
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size={size} className={className} onClick={() => setOpen(true)}>
        <Icon name="link" className="size-[1.125rem]" />
        {label}
      </Button>
      <AddItemDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** The link-or-note form in a dialog (a bottom sheet on phones). */
export function AddItemDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Save a link or note"
      description="Saved links and notes don't use any file storage."
    >
      <AddItemForm onDone={onClose} />
    </Dialog>
  );
}

function AddItemForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("link");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const read = (name: string) => String(form.get(name) ?? "");

    const candidate =
      mode === "link"
        ? { type: "link", url: read("url"), title: read("title"), note: read("note") }
        : { type: "note", text: read("text"), title: read("title") };

    const parsed = createItemSchema.safeParse(candidate);
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
      await apiRequest<{ item: FileItem }>("/api/files", { method: "POST", body: parsed.data });
      toast.show(mode === "link" ? "Link saved." : "Note saved.");
      router.refresh();
      onDone();
    } catch (error) {
      setSaving(false);
      setFormError(error instanceof ApiError ? error.message : "Couldn't save. Try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div role="group" aria-label="What to save" className="grid grid-cols-2 gap-1 rounded-control bg-surface-muted p-1">
        {(["link", "note"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            disabled={saving}
            onClick={() => {
              setMode(option);
              setFieldErrors({});
              setFormError(null);
            }}
            className={cn(
              "h-9 rounded-[0.6rem] text-sm font-medium transition-colors disabled:opacity-50",
              mode === option ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground",
            )}
          >
            {option === "link" ? "Link" : "Note"}
          </button>
        ))}
      </div>

      {mode === "link" ? (
        <TextField
          name="url"
          label="Web address"
          placeholder="https://example.com/page"
          autoComplete="off"
          spellCheck={false}
          inputMode="url"
          autoFocus
          error={fieldErrors.url}
          disabled={saving}
        />
      ) : (
        <div className="space-y-1.5">
          <label htmlFor="note-text" className="block text-sm font-medium text-foreground">
            Note
          </label>
          <textarea
            id="note-text"
            name="text"
            rows={4}
            autoFocus
            aria-invalid={fieldErrors.text ? true : undefined}
            aria-describedby={fieldErrors.text ? "note-text-error" : undefined}
            disabled={saving}
            className={textareaClasses}
          />
          {fieldErrors.text ? (
            <p id="note-text-error" className="text-sm text-danger">
              {fieldErrors.text}
            </p>
          ) : null}
        </div>
      )}

      <TextField
        name="title"
        label="Title (optional)"
        autoComplete="off"
        error={fieldErrors.title}
        disabled={saving}
        hint={mode === "link" ? "Defaults to the website name." : "Defaults to the first line of the note."}
      />

      {mode === "link" ? (
        <div className="space-y-1.5">
          <label htmlFor="link-note" className="block text-sm font-medium text-foreground">
            Note (optional)
          </label>
          <textarea
            id="link-note"
            name="note"
            rows={2}
            disabled={saving}
            aria-invalid={fieldErrors.note ? true : undefined}
            className={textareaClasses}
          />
          {fieldErrors.note ? <p className="text-sm text-danger">{fieldErrors.note}</p> : null}
        </div>
      ) : null}

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
          {saving ? "Saving…" : mode === "link" ? "Save link" : "Save note"}
        </Button>
      </div>
    </form>
  );
}
