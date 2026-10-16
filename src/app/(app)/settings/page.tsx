import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InstallRow } from "@/components/app/install-promo";
import { StorageCard } from "@/components/app/storage-card";
import { ProfileCard, SessionsGroup } from "@/components/settings/account-section";
import { LibrarySettingsGroup } from "@/components/settings/preferences-form";
import { SettingsNav, type SettingsNavItem } from "@/components/settings/settings-nav";
import { Callout, SettingRow, SettingsGroup } from "@/components/settings/settings-ui";
import { Icon } from "@/components/ui/icons";
import { CompressionSettingsGroup } from "@/components/uploads/compression-settings";
import { getCurrentSession } from "@/lib/auth/session";
import { getStorageStatus } from "@/lib/files/repository";
import { getPreferences } from "@/lib/preferences/repository";

export const metadata: Metadata = {
  title: "Settings",
};

// Reads the session, so block on the server (see the layout).
export const instant = false;

const SECTIONS: SettingsNavItem[] = [
  { id: "uploads", label: "Uploads", icon: "sparkles" },
  { id: "library", label: "Library", icon: "folderOpen" },
  { id: "storage", label: "Storage", icon: "cloud" },
  { id: "app", label: "App", icon: "keyboard" },
  { id: "account", label: "Account", icon: "shield" },
];

/**
 * Settings: a profile card, then grouped setting rows with section navigation (a sticky list on
 * large screens, sticky pills on phones). Every change saves straight away.
 */
export default async function SettingsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const [preferences, storage] = await Promise.all([
    getPreferences(session.user.id),
    getStorageStatus(session.user.id),
  ]);

  return (
    <div className="flex w-full flex-col gap-5 sm:gap-6">
      <div>
        <h1 className="text-title text-foreground">Settings</h1>
        <p className="mt-1 text-body text-muted">Your account, uploads and storage. Changes save automatically.</p>
      </div>

      <ProfileCard name={session.user.name} email={session.user.email} itemCount={storage.count} />

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <SettingsNav items={SECTIONS} />

        <div className="flex min-w-0 max-w-3xl flex-col gap-5 sm:gap-6">
          <CompressionSettingsGroup id="uploads" />

          <LibrarySettingsGroup id="library" initial={preferences} />

          <SettingsGroup
            id="storage"
            icon="cloud"
            title="Storage"
            description="What your files use, measured after compression. Links and notes use no file storage."
          >
            <div className="px-4 py-5 sm:px-5">
              <StorageCard storage={storage} />
            </div>
            <div className="px-4 py-4 sm:px-5">
              <Callout tone="success" icon="lock">
                Your files are private. They open only while you&apos;re signed in, including links you copy.
              </Callout>
            </div>
            <SettingRow
              label="Free up space"
              description="In your library, choose Select (or press and hold on a phone) to delete several files at once."
              control={<Icon name="trash" className="size-5 text-muted" />}
            />
            <SettingRow
              label="Account-wide usage"
              description="Whoever runs this QuickDrop can see total usage in Cloudinary."
              stackOnMobile
              control={
                <a
                  href="https://console.cloudinary.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-surface-container px-4 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-surface-highest sm:w-auto"
                >
                  Cloudinary console
                  <Icon name="open" className="size-4" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              }
            />
          </SettingsGroup>

          <SettingsGroup id="app" icon="keyboard" title="App" description="Use QuickDrop like an app on your phone.">
            <InstallRow />
          </SettingsGroup>

          <SessionsGroup id="account" email={session.user.email} />
        </div>
      </div>
    </div>
  );
}
