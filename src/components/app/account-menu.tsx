"use client";

import { useRouter } from "next/navigation";
import { useSignOut } from "@/components/app/sign-out-button";
import { ActionMenu } from "@/components/ui/action-menu";

export function initialsOf(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "Q";
}

/** Round avatar that opens Settings and Sign out (phones; the sidebar has a profile row). */
export function AccountMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const { signOut } = useSignOut();

  return (
    <ActionMenu
      label="Account menu"
      title={name || email}
      triggerClassName="size-9 rounded-full bg-primary text-[11px] font-bold text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground"
      triggerIcon={<span aria-hidden="true">{initialsOf(name, email)}</span>}
      actions={[
        { id: "settings", label: "Settings", icon: "settings", onSelect: () => router.push("/settings") },
        { id: "sign-out", label: "Sign out", icon: "logout", tone: "danger", onSelect: () => void signOut() },
      ]}
    />
  );
}
