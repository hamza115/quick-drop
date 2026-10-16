"use client";

import { useId, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/* ---------- Group ---------- */

interface SettingsGroupProps {
  id: string;
  icon: IconName;
  title: string;
  description: string;
  /** Small label in the header, for example "This device" or "All devices". */
  scope?: string;
  /** Shown at the right of the header, for example a save indicator. */
  status?: ReactNode;
  children: ReactNode;
}

/** A titled card of setting rows. The id is the anchor used by the section navigation. */
export function SettingsGroup({ id, icon, title, description, scope, status, children }: SettingsGroupProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-32 lg:scroll-mt-24">
      <div className="overflow-hidden rounded-card bg-surface shadow-card">
        <header className="flex items-start gap-3 border-b border-border px-4 py-4 sm:px-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-container text-foreground">
            <Icon name={icon} className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 id={`${id}-title`} className="text-item text-foreground">
                {title}
              </h2>
              {scope ? (
                <span className="rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {scope}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-caption text-muted">{description}</p>
          </div>
          {status ? <div className="shrink-0 pt-0.5">{status}</div> : null}
        </header>
        <div className="divide-y divide-border">{children}</div>
      </div>
    </section>
  );
}

/* ---------- Row ---------- */

interface SettingRowProps {
  label: string;
  description?: ReactNode;
  /** The control: a switch, segmented buttons, a select or a button. */
  control: ReactNode;
  /** id of the control, so the label is wired to it. */
  htmlFor?: string;
  /** Put wide controls (segmented buttons, selects) under the text on phones. */
  stackOnMobile?: boolean;
  disabled?: boolean;
  children?: ReactNode;
}

/** Label and description on the left, control on the right. Extra content (notes) goes underneath. */
export function SettingRow({ label, description, control, htmlFor, stackOnMobile = false, disabled = false, children }: SettingRowProps) {
  return (
    <div className={cn("px-4 py-4 sm:px-5", disabled && "opacity-55")}>
      <div className={cn("flex gap-3 sm:items-center sm:gap-6", stackOnMobile ? "flex-col sm:flex-row" : "items-center")}>
        <div className="min-w-0 flex-1">
          {htmlFor ? (
            <label htmlFor={htmlFor} className="text-item text-foreground">
              {label}
            </label>
          ) : (
            <p className="text-item text-foreground">{label}</p>
          )}
          {description ? <div className="mt-0.5 text-caption text-muted">{description}</div> : null}
        </div>
        <div className={cn("shrink-0", stackOnMobile && "w-full sm:w-auto")}>{control}</div>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

/* ---------- Switch ---------- */

interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Accessible name when there is no visible label wired with htmlFor. */
  label?: string;
}

/** iOS-style toggle. A button with role="switch", so it works with keyboards and screen readers. */
export function Switch({ id, checked, onChange, disabled = false, label }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed",
        checked ? "bg-primary" : "bg-surface-highest",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-5 rounded-full bg-surface shadow-raised transition-transform duration-200 motion-reduce:transition-none",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

/* ---------- Segmented control ---------- */

interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
  icon?: IconName;
}

interface SegmentedProps<T extends string | number> {
  label: string;
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange: (value: T) => void;
  disabled?: boolean;
}

/** Pill-shaped radio group, for two to four short choices. Fills the width on phones. */
export function Segmented<T extends string | number>({ label, value, options, onChange, disabled = false }: SegmentedProps<T>) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className="flex w-full rounded-full bg-surface-muted p-1 sm:w-auto">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <label
            key={String(option.value)}
            className={cn(
              "relative flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring sm:flex-none",
              active ? "bg-surface text-foreground shadow-soft" : "text-muted hover:text-foreground",
              disabled && "cursor-not-allowed",
            )}
          >
            <input
              type="radio"
              name={name}
              value={String(option.value)}
              checked={active}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.icon ? <Icon name={option.icon} className="size-4" /> : null}
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

/* ---------- Save indicator ---------- */

export type SaveState = "idle" | "saving" | "saved" | "error";

/** Small status text for auto-saved groups. */
export function SaveStatus({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  return (
    <span
      aria-live="polite"
      className={cn(
        "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        state === "saved" && "bg-live-soft text-live-ink",
        state === "saving" && "bg-surface-container text-muted",
        state === "error" && "bg-danger-soft text-danger",
      )}
    >
      {state === "saved" ? <Icon name="check" className="size-3" /> : null}
      {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Not saved"}
    </span>
  );
}

/** Soft info or warning box inside a row. */
export function Callout({ tone = "info", icon, children }: { tone?: "info" | "warning" | "success"; icon?: IconName; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-caption",
        tone === "info" && "bg-surface-muted text-muted",
        tone === "warning" && "bg-warning-soft text-foreground",
        tone === "success" && "bg-live-soft/60 text-foreground",
      )}
    >
      <Icon
        name={icon ?? (tone === "warning" ? "alert" : tone === "success" ? "shield" : "info")}
        className={cn("mt-0.5 size-4 shrink-0", tone === "warning" && "text-warning", tone === "success" && "text-live-strong")}
      />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
