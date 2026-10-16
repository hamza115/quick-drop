"use client";

import { useState } from "react";
import { initialsOf } from "@/components/app/account-menu";
import { useSignOut } from "@/components/app/sign-out-button";
import { SettingRow, SettingsGroup } from "@/components/settings/settings-ui";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth/client";

/** Top of the settings page: who is signed in, with a quick sign-out. */
export function ProfileCard({ name, email, itemCount }: { name: string; email: string; itemCount: number }) {
  const { signOut, pending } = useSignOut();

  return (
    <section aria-label="Your account" className="relative overflow-hidden rounded-card bg-surface p-5 shadow-card sm:p-6">
      {/* Soft decoration, top right. */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-surface-container blur-2xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <span
          aria-hidden="true"
          className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-raised"
        >
          {initialsOf(name, email)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-title text-foreground">{name || "Your account"}</p>
          <p className="truncate text-body text-muted">{email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-live-soft px-2.5 py-0.5 text-[11px] font-semibold text-live-ink">
              <Icon name="lock" className="size-3" />
              Private account
            </span>
            <span className="inline-flex items-center rounded-full bg-surface-container px-2.5 py-0.5 text-[11px] font-semibold text-muted">
              {itemCount} {itemCount === 1 ? "item" : "items"} saved
            </span>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={signOut} loading={pending} className="self-start sm:self-center">
          <Icon name="logout" className="size-4" />
          Sign out
        </Button>
      </div>
    </section>
  );
}

/** Sessions: sign out everywhere else, and how long sessions last. */
export function SessionsGroup({ id, email }: { id: string; email: string }) {
  const toast = useToast();
  const { signOut, pending } = useSignOut();
  const [revoking, setRevoking] = useState(false);

  async function signOutOtherDevices() {
    setRevoking(true);
    try {
      const { error } = await authClient.revokeOtherSessions();
      if (error) throw new Error("revoke failed");
      toast.show("Signed out on your other devices.");
    } catch {
      toast.show("Couldn't sign out your other devices. Try again.", "error");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <SettingsGroup id={id} icon="shield" title="Account & security" description="Your sign-in and active sessions.">
      <SettingRow
        label="Signed in as"
        description={<span className="break-all">{email}</span>}
        stackOnMobile
        control={
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-1 text-[11px] font-semibold text-muted">
            <Icon name="user" className="size-3.5" />
            Email &amp; password
          </span>
        }
      />
      <SettingRow
        label="Other devices"
        description="Signs you out everywhere except this browser. Sessions otherwise last 7 days."
        stackOnMobile
        control={
          <Button variant="secondary" size="sm" onClick={signOutOtherDevices} loading={revoking} className="w-full sm:w-auto">
            Sign out other devices
          </Button>
        }
      />
      <SettingRow
        label="This device"
        description="Sign out of QuickDrop in this browser."
        stackOnMobile
        control={
          <Button variant="danger" size="sm" onClick={signOut} loading={pending} className="w-full sm:w-auto">
            <Icon name="logout" className="size-4" />
            Sign out
          </Button>
        }
      />
    </SettingsGroup>
  );
}
