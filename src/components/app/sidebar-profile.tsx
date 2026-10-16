"use client";

import Link from "next/link";
import { initialsOf } from "@/components/app/account-menu";
import { useSignOut } from "@/components/app/sign-out-button";
import { Icon } from "@/components/ui/icons";

/** Profile row at the bottom of the sidebar: avatar, name and email, settings and sign-out. */
export function SidebarProfile({ name, email, collapsed = false }: { name: string; email: string; collapsed?: boolean }) {
  const { signOut, pending } = useSignOut();

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-lg bg-surface-container py-1.5">
        <Link
          href="/settings"
          title={`${name || "Your account"} · ${email}`}
          aria-label="Account settings"
          className="grid size-9 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground"
        >
          {initialsOf(name, email)}
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={pending}
          title="Sign out"
          aria-label="Sign out"
          className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          <Icon name="logout" className="size-[18px]" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-container p-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground"
        >
          {initialsOf(name, email)}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-item leading-tight text-foreground">{name || "Your account"}</span>
          <span className="truncate text-caption leading-tight text-muted">{email}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        <Link
          href="/settings"
          title="Settings"
          aria-label="Settings"
          className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:text-foreground"
        >
          <Icon name="settings" className="size-[18px]" />
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={pending}
          title="Sign out"
          aria-label="Sign out"
          className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          <Icon name="logout" className="size-[18px]" />
        </button>
      </div>
    </div>
  );
}
