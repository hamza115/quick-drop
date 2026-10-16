"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  /** Optional icon inside the field, on the left. */
  icon?: IconName;
  /** Optional content on the right of the label row, for example a link. */
  labelAside?: ReactNode;
}

/**
 * Labelled input with optional leading icon, hint and error. Password fields get a show/hide
 * button, so people can check what they typed on a phone keyboard.
 */
export function TextField({ id, label, error, hint, icon, labelAside, className, type, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="text-[13px] font-semibold text-foreground">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        {icon ? (
          <Icon name={icon} className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
        ) : null}
        <input
          id={inputId}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-12 w-full rounded-control border bg-surface-muted px-3.5 text-base text-foreground outline-none transition-[border-color,box-shadow,background-color] placeholder:text-subtle hover:bg-surface-container focus:border-foreground focus:bg-surface focus:ring-4 focus:ring-foreground/8 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:text-[14px]",
            icon && "pl-10",
            isPassword && "pr-11",
            error ? "border-danger" : "border-transparent",
            className,
          )}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            aria-controls={inputId}
            className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted transition-colors hover:text-foreground"
          >
            <Icon name={revealed ? "eyeOff" : "eye"} className="size-[18px]" />
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="text-caption text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-caption text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
