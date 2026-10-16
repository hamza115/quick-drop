"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function subscribeStandalone(onChange: () => void): () => void {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Install support: uses the browser's install prompt where it exists (Chrome, Edge, Android);
 * otherwise opens instructions for Add to Home Screen. Knows when QuickDrop already runs as an app.
 */
function useInstall() {
  const standalone = useSyncExternalStore(subscribeStandalone, isStandalone, () => false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    function onPrompt(event: Event) {
      event.preventDefault(); // keep the browser's mini-bar quiet; we show our own button
      setInstallEvent(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function install() {
    if (!installEvent) {
      setHelpOpen(true);
      return;
    }
    await installEvent.prompt();
    await installEvent.userChoice.catch(() => undefined);
    setInstallEvent(null);
  }

  return { standalone, install, helpOpen, closeHelp: () => setHelpOpen(false) };
}

/** Line illustration: a phone passing a file to a laptop. Decorative. */
function DevicesIllustration() {
  return (
    <svg
      aria-hidden="true"
      width="92"
      height="64"
      viewBox="0 0 150 104"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-foreground"
    >
      <rect x="8" y="22" width="34" height="62" rx="7" />
      <path d="M20 28h10" />
      <rect x="15" y="40" width="20" height="16" rx="3" className="fill-surface-high" />
      <path d="M18 52l4-4 3 3 2-2 5 5" />
      <rect x="74" y="26" width="62" height="42" rx="5" />
      <path d="M64 76h82l-6 8H70z" />
      <rect x="84" y="36" width="26" height="22" rx="3" className="fill-live-soft" />
      <path d="M115 40h14M115 46h10M115 52h12" />
      <path d="M46 46c8-14 18-18 26-16" strokeDasharray="3 4" />
      <path d="m66 26 6 4-5 5" />
      <circle cx="58" cy="14" r="5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function InstallHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const steps = [
    { title: "iPhone or iPad (Safari)", body: "Tap Share, then Add to Home Screen." },
    { title: "Android (Chrome)", body: "Tap the ⋮ menu, then Install app or Add to Home screen." },
    { title: "Then", body: "Open QuickDrop from the new icon. It runs full-screen, without the browser bars." },
  ];
  return (
    <Dialog open={open} onClose={onClose} title="Install QuickDrop" description="Open QuickDrop in your phone's browser, then:">
      <ol className="flex flex-col gap-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-container text-caption font-semibold text-foreground">
              {index + 1}
            </span>
            <span className="text-body text-foreground">
              <strong className="font-semibold">{step.title}:</strong> {step.body}
            </span>
          </li>
        ))}
      </ol>
    </Dialog>
  );
}

/** Settings row: install QuickDrop as an app, or "Installed" when it already runs as one. */
export function InstallRow() {
  const { standalone, install, helpOpen, closeHelp } = useInstall();
  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="hidden shrink-0 rounded-xl bg-surface-muted p-2 sm:block">
          <DevicesIllustration />
        </div>
        <div className="min-w-0">
          <p className="text-item text-foreground">Install on your phone</p>
          <p className="mt-0.5 text-caption text-muted">
            Opens full-screen from your home screen, like a native app, with the tab bar and quick add button.
          </p>
        </div>
      </div>
      {standalone ? (
        <span className="inline-flex items-center gap-1 self-start rounded-full bg-live-soft px-3 py-1 text-[12px] font-semibold text-live-ink sm:self-center">
          <Icon name="check" className="size-3.5" />
          Installed
        </span>
      ) : (
        <Button size="sm" onClick={install} className="w-full sm:w-auto">
          Install app
        </Button>
      )}
      <InstallHelp open={helpOpen} onClose={closeHelp} />
    </div>
  );
}
