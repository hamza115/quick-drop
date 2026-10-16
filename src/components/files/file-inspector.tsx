"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { DeleteItemDialog } from "@/components/files/delete-item-dialog";
import type { MediaSize } from "@/components/files/media-stage";
import { useItemActions } from "@/components/files/use-item-actions";
import { useItemUpdate } from "@/components/files/use-item-update";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icons";
import { RelativeTime } from "@/components/ui/relative-time";
import { cn } from "@/lib/cn";
import { percentSaved } from "@/lib/compression/plan";
import { KIND_LABELS, type FileItem } from "@/lib/files/constants";
import { formatBytes, hostnameOf } from "@/lib/files/format";
import { LIMITS, parseWebUrl } from "@/lib/files/validation";

function formatBadge(item: FileItem): string {
  if (item.kind === "link" || item.kind === "note") return KIND_LABELS[item.kind];
  const name = item.originalName ?? item.displayName;
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 ? name.slice(dot + 1).toUpperCase() : "";
  return extension && extension.length <= 5 ? `${extension} ${KIND_LABELS[item.kind]}` : KIND_LABELS[item.kind];
}

function dateTime(iso: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

/* ---------- Title (inline rename) ---------- */

function InlineTitle({ item }: { item: FileItem }) {
  const { save } = useItemUpdate(item.id);
  const [value, setValue] = useState(item.displayName);
  const [baseline, setBaseline] = useState(item.displayName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pick up a new title after a save or when moving to another file.
  if (baseline !== item.displayName) {
    setBaseline(item.displayName);
    setValue(item.displayName);
  }

  async function commit() {
    const next = value.trim();
    if (!next || next === item.displayName) {
      setValue(item.displayName);
      return;
    }
    const saved = await save({ displayName: next });
    if (!saved) setValue(item.displayName);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {
      setValue(item.displayName);
      requestAnimationFrame(() => inputRef.current?.blur());
    }
  }

  return (
    <div className="group mt-1 flex items-center gap-1">
      <label htmlFor="file-title" className="sr-only">
        Title
      </label>
      <input
        ref={inputRef}
        id="file-title"
        value={value}
        maxLength={LIMITS.title}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className="w-full min-w-0 truncate rounded bg-transparent px-1 py-0.5 text-title text-foreground outline-none transition-colors -ml-1 hover:bg-surface-muted focus:bg-surface-muted"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.focus()}
        aria-label="Rename"
        title="Rename"
        className="grid size-8 shrink-0 place-items-center rounded text-muted transition-colors hover:bg-surface-container group-hover:text-foreground"
      >
        <Icon name="edit" className="size-[18px]" />
      </button>
    </div>
  );
}

/* ---------- Tags ---------- */

function TagEditor({ item }: { item: FileItem }) {
  const { save, saving } = useItemUpdate(item.id);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  async function add(event?: FormEvent) {
    event?.preventDefault();
    const tag = draft.trim().replace(/^#/, "").slice(0, LIMITS.tagLength);
    setDraft("");
    setAdding(false);
    if (!tag || item.tags.includes(tag) || item.tags.length >= LIMITS.tags) return;
    await save({ tags: [...item.tags, tag] });
  }

  async function remove(tag: string) {
    await save({ tags: item.tags.filter((existing) => existing !== tag) });
  }

  return (
    <section aria-labelledby="tags-heading" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 id="tags-heading" className="text-item text-foreground">
          Tags
        </h2>
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={item.tags.length >= LIMITS.tags}
          className="flex items-center gap-1 text-caption font-semibold text-foreground hover:underline disabled:opacity-50"
        >
          <Icon name="plus" className="size-3.5" />
          Add tag
        </button>
      </div>
      <ul className="flex flex-wrap items-center gap-1">
        {item.tags.map((tag) => (
          <li key={tag} className="flex items-center gap-1 rounded-full bg-surface-container py-1 pl-3 pr-1.5 text-caption text-foreground">
            <span>#{tag}</span>
            <button
              type="button"
              onClick={() => void remove(tag)}
              disabled={saving}
              aria-label={`Remove tag ${tag}`}
              className="grid size-5 place-items-center rounded-full transition-colors hover:bg-surface-highest hover:text-danger"
            >
              <Icon name="close" className="size-3" />
            </button>
          </li>
        ))}
        <li>
          {adding ? (
            <form onSubmit={add} className="flex">
              <label htmlFor="new-tag" className="sr-only">
                New tag
              </label>
              <input
                ref={inputRef}
                id="new-tag"
                value={draft}
                maxLength={LIMITS.tagLength + 1}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => void add()}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setDraft("");
                    setAdding(false);
                  }
                }}
                placeholder="tag name"
                className="h-7 w-32 rounded-full bg-surface-muted px-3 text-caption text-foreground outline-none ring-foreground/20 focus:ring-2"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              disabled={item.tags.length >= LIMITS.tags}
              className="flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-caption text-muted transition-colors hover:bg-surface-container disabled:opacity-50"
            >
              <Icon name="tag" className="size-3.5" />
              New
            </button>
          )}
        </li>
      </ul>
    </section>
  );
}

/* ---------- Notes (auto-saved) ---------- */

function NotesEditor({ item }: { item: FileItem }) {
  const { save, saving } = useItemUpdate(item.id);
  const [value, setValue] = useState(item.note ?? "");
  const [baseline, setBaseline] = useState(item.note ?? "");
  const [status, setStatus] = useState<"saved" | "editing" | "saving">("saved");
  const isNote = item.kind === "note";

  if (baseline !== (item.note ?? "")) {
    setBaseline(item.note ?? "");
    setValue(item.note ?? "");
  }

  // Save a moment after typing stops.
  useEffect(() => {
    if (value === (item.note ?? "")) return;
    const timer = window.setTimeout(async () => {
      if (isNote && !value.trim()) return; // a note can't be emptied here
      setStatus("saving");
      const saved = await save({ note: value });
      setStatus(saved ? "saved" : "editing");
    }, 900);
    return () => window.clearTimeout(timer);
  }, [value, item.note, isNote, save]);

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor="file-notes" className="text-item text-foreground">
          {isNote ? "Note text" : "Notes"}
        </label>
        <span className="text-caption text-muted" aria-live="polite">
          {status === "saving" || saving ? "Saving…" : status === "editing" ? "Not saved" : "Auto-saved"}
        </span>
      </div>
      <div className="rounded-xl bg-surface-muted p-3">
        <textarea
          id="file-notes"
          value={value}
          maxLength={LIMITS.note}
          rows={isNote ? 6 : 3}
          onChange={(event) => {
            setValue(event.target.value);
            setStatus("editing");
          }}
          placeholder="Add context, steps to reproduce, or a staging link…"
          className="w-full resize-none rounded-lg bg-surface p-2.5 text-base text-foreground shadow-soft outline-none placeholder:text-muted focus:ring-2 focus:ring-foreground/15 sm:text-body"
        />
        <div className="mt-2 flex items-center justify-between text-caption text-muted">
          <span className="flex items-center gap-1">
            <Icon name="history" className="size-3.5" />
            Edited <RelativeTime iso={item.updatedAt} />
          </span>
          <span className="font-mono">
            {value.length} {value.length === 1 ? "char" : "chars"}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ---------- Activity ---------- */

function Activity({ item, savedPercent }: { item: FileItem; savedPercent: number | null }) {
  const created = new Date(item.createdAt).getTime();
  const edited = new Date(item.updatedAt).getTime() - created > 60_000;
  const events: Array<{ label: string; iso: string; strong: boolean }> = [
    ...(edited ? [{ label: "Details edited", iso: item.updatedAt, strong: true }] : []),
    ...(savedPercent !== null
      ? [{ label: `Compressed in your browser before upload (${savedPercent}% smaller)`, iso: item.createdAt, strong: !edited }]
      : []),
    {
      label: item.kind === "link" ? "Link saved" : item.kind === "note" ? "Note saved" : "Uploaded to QuickDrop",
      iso: item.createdAt,
      strong: !edited && savedPercent === null,
    },
  ];

  return (
    <section aria-labelledby="activity-heading" className="flex flex-col gap-2">
      <h2 id="activity-heading" className="text-item text-foreground">
        Recent activity
      </h2>
      <ol className="flex flex-col gap-1.5 text-caption">
        {events.map((event) => (
          <li key={event.label} className="flex items-start gap-2">
            <span className={cn("mt-2 size-1.5 shrink-0 rounded-full", event.strong ? "bg-primary" : "bg-surface-highest")} aria-hidden="true" />
            <span className="flex flex-col">
              <span className="text-foreground">{event.label}</span>
              <span className="text-muted">{dateTime(event.iso)}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- Actions ---------- */

interface ActionButton {
  id: string;
  label: string;
  /** Small muted text after the label, for example the file size. */
  detail?: string;
  icon: IconName;
  onClick?: () => void;
  href?: string;
  busy?: boolean;
}

function ActionFooter({ item }: { item: FileItem }) {
  const actions = useItemActions(item);
  const [deleting, setDeleting] = useState(false);
  const size = item.kind !== "link" && item.kind !== "note" ? formatBytes(item.storedSizeBytes ?? item.originalSizeBytes) : null;
  const linkHref = item.linkUrl ? (parseWebUrl(item.linkUrl)?.href ?? null) : null;

  const copy: ActionButton | null = actions.copyTarget
    ? { id: "copy", label: actions.copyTarget.label, icon: "link", onClick: () => void actions.copy() }
    : null;
  const download: ActionButton | null = actions.canDownload
    ? {
        id: "download",
        label: "Download",
        detail: size ?? undefined,
        icon: "download",
        onClick: () => void actions.download(),
        busy: actions.busy === "download",
      }
    : null;

  // The most useful action for each kind leads; the rest follow.
  let primary: ActionButton | null;
  let secondary: Array<ActionButton | null>;
  if (actions.canCopyImage) {
    primary = { id: "copy-image", label: "Copy Image to Clipboard", icon: "copy", onClick: () => void actions.copyImage(), busy: actions.busy === "copy-image" };
    secondary = [download, copy];
  } else if (item.kind === "link" && linkHref) {
    primary = { id: "open", label: "Open Link", icon: "open", href: linkHref };
    secondary = [copy, null];
  } else if (item.kind === "note") {
    primary = copy && { ...copy, label: "Copy Note Text", icon: "copy" };
    secondary = [download, null];
  } else {
    primary = download;
    secondary = [copy, item.secureUrl ? { id: "tab", label: "Open in Tab", icon: "open", href: item.secureUrl } : null];
  }
  const secondaryButtons = secondary.filter((button): button is ActionButton => button !== null);

  function render(button: ActionButton, variant: "primary" | "secondary") {
    const className = cn(
      "flex w-full min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-item transition-[background-color,transform] active:scale-[0.98] disabled:opacity-60",
      variant === "primary"
        ? "bg-primary py-2.5 text-primary-foreground hover:bg-primary-hover"
        : "bg-surface-container py-2 text-foreground hover:bg-surface-highest",
    );
    const content = (
      <>
        <Icon name={button.icon} className={cn("shrink-0", variant === "primary" ? "size-[18px]" : "size-4", button.busy && "animate-pulse")} />
        <span className="truncate">{button.label}</span>
        {button.detail ? <span className="shrink-0 text-caption font-normal text-muted">{button.detail}</span> : null}
      </>
    );
    if (button.href) {
      return (
        <a key={button.id} href={button.href} target="_blank" rel="noopener noreferrer" className={className}>
          {content}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      );
    }
    return (
      <button key={button.id} type="button" onClick={button.onClick} disabled={button.busy} className={className}>
        {content}
      </button>
    );
  }

  return (
    // Pinned to the bottom only when the window is tall enough to leave room for the details.
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 bg-surface p-5 shadow-[0_-4px_16px_rgb(0_0_0/0.03)] lg:px-6 xl:sticky xl:bottom-0 xl:max-w-none">
      {primary ? render(primary, "primary") : null}
      {secondaryButtons.length > 0 ? (
        <div className={cn("grid gap-2", secondaryButtons.length > 1 && "grid-cols-2")}>
          {secondaryButtons.map((button) => render(button, "secondary"))}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="flex min-w-0 items-center gap-1 text-caption text-muted" title="Files open only while you're signed in, including links you copy.">
          <Icon name="lock" className="size-3.5 shrink-0" />
          <span className="truncate">Private file</span>
        </span>
        <button type="button" onClick={() => setDeleting(true)} className="flex shrink-0 items-center gap-1 text-caption text-danger transition-opacity hover:opacity-80">
          <Icon name="trash" className="size-4" />
          Delete
        </button>
      </div>
      <DeleteItemDialog item={item} open={deleting} onClose={() => setDeleting(false)} />
    </div>
  );
}

/* ---------- Inspector ---------- */

/** Right-hand panel of the file screen: identity, details, tags, notes, activity and actions. */
export function FileInspector({ item, size }: { item: FileItem; size: MediaSize | null }) {
  const actions = useItemActions(item);
  const stored = item.storedSizeBytes ?? item.originalSizeBytes;
  const savedPercent = item.compression ? percentSaved(item.compression.originalBytes, stored) : null;
  const isFile = item.kind !== "link" && item.kind !== "note";

  const specs: Array<[string, string]> = [
    ...(item.kind === "image" || item.kind === "video"
      ? ([["Resolution", size ? `${size.width} × ${size.height}` : "—"]] as Array<[string, string]>)
      : item.kind === "link"
        ? ([["Website", hostnameOf(item.linkUrl ?? "")]] as Array<[string, string]>)
        : ([["Type", KIND_LABELS[item.kind]]] as Array<[string, string]>)),
    [isFile ? "Format" : "Kind", isFile ? (item.mimeType ?? "Unknown") : KIND_LABELS[item.kind]],
    ["Saved", dateTime(item.createdAt)],
    [isFile ? "Size" : "Last changed", isFile ? formatBytes(stored) : dateTime(item.updatedAt)],
  ];

  return (
    <aside aria-label="File details" className="flex flex-1 flex-col justify-between bg-surface">
      {/* Centred column when stacked under the stage; full panel width when side by side. */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-5 lg:p-6 xl:max-w-none">
        {/* Identity */}
        <div className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1">
              <span className="rounded-full bg-surface-highest px-2 py-0.5 font-mono text-caption font-semibold uppercase tracking-wider text-foreground">
                {formatBadge(item)}
              </span>
              {savedPercent !== null ? (
                <span className="flex items-center gap-0.5 rounded-full bg-live-soft px-2 py-0.5 text-caption font-semibold text-live-ink">
                  <Icon name="bolt" className="size-3.5" />
                  Optimized
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void actions.toggleFavorite()}
              disabled={actions.busy === "favorite"}
              aria-pressed={item.isFavorite}
              aria-label={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
              title={item.isFavorite ? "Favorite" : "Add to favorites"}
              className={cn(
                "grid size-9 place-items-center rounded-full transition-colors hover:bg-surface-container disabled:opacity-50",
                item.isFavorite ? "text-foreground" : "text-muted",
              )}
            >
              <Icon name="star" filled={item.isFavorite} className="size-[22px]" />
            </button>
          </div>
          <InlineTitle item={item} />
          <span className="text-caption text-muted">
            {item.compression ? `Original: ${item.compression.originalName} · ` : ""}
            Saved <RelativeTime iso={item.createdAt} />
          </span>
        </div>

        {/* Compression + details well */}
        <div className="flex flex-col gap-3 rounded-xl bg-surface-muted p-4">
          <div className="flex items-center justify-between">
            <span className="flex min-w-0 items-center gap-1.5 text-item text-foreground">
              <Icon name={savedPercent !== null ? "compress" : "info"} className="size-[18px] shrink-0" />
              {savedPercent !== null ? "Compression breakdown" : "Details"}
            </span>
            {savedPercent !== null ? (
              <span className="shrink-0 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 font-mono text-caption font-bold text-primary-foreground">
                Saved {savedPercent}%
              </span>
            ) : null}
          </div>

          {item.compression && savedPercent !== null ? (
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap justify-between gap-x-3 font-mono text-caption text-muted">
                <span>QuickDrop {formatBytes(stored)}</span>
                <span className="line-through">Original {formatBytes(item.compression.originalBytes)}</span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-highest" aria-hidden="true">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, 100 - savedPercent)}%` }} />
                <div className="h-full flex-1 bg-secondary-dim/40" />
              </div>
            </div>
          ) : null}

          <dl className="grid grid-cols-2 gap-1.5">
            {specs.map(([label, value]) => (
              <div key={label} className="flex min-w-0 flex-col rounded-lg bg-surface p-2.5">
                <dt className="text-caption text-muted">{label}</dt>
                <dd className="mt-0.5 truncate text-item text-foreground" title={value}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <TagEditor item={item} />
        <NotesEditor item={item} />
        <Activity item={item} savedPercent={savedPercent} />
      </div>

      <ActionFooter item={item} />
    </aside>
  );
}
