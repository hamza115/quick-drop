"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { AccountMenu } from "@/components/app/account-menu";
import { MobileTabBar } from "@/components/app/mobile-tab-bar";
import { SearchForm } from "@/components/app/search-form";
import { ShortcutsButton } from "@/components/app/shortcuts-button";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { SidebarProfile } from "@/components/app/sidebar-profile";
import { StorageCard } from "@/components/app/storage-card";
import { AddItemButton } from "@/components/library/add-item-button";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { UploadButton } from "@/components/uploads/upload-button";
import { UploadsIndicator } from "@/components/uploads/uploads-indicator";
import type { StorageStatus } from "@/lib/files/quota";
import { cn } from "@/lib/cn";
import { SIDEBAR_COOKIE } from "@/lib/ui-prefs";

interface AppShellProps {
  userEmail: string;
  userName: string;
  storage: StorageStatus;
  /** From the sidebar cookie, read by the server layout. */
  sidebarCollapsed?: boolean;
  children: ReactNode;
}

/**
 * Large screens (design.html): fixed grey sidebar (logo, nav with a black active pill, storage card,
 * profile row) and a frosted top bar (search, Add Link, Upload Files, uploads bell, shortcuts).
 * Phones: compact app bar and a bottom tab bar with a "+" button, like a native app.
 */
export function AppShell({ userEmail, userName, storage, sidebarCollapsed = false, children }: AppShellProps) {
  const [mobileSearch, setMobileSearch] = useState(false);
  const [collapsed, setCollapsed] = useState(sidebarCollapsed);

  const toggleSidebar = useCallback(() => setCollapsed((value) => !value), []);

  // Remember the choice for a year, so the server renders the same width next time.
  useEffect(() => {
    document.cookie = `${SIDEBAR_COOKIE}=${collapsed ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }, [collapsed]);

  // ⌘B / Ctrl+B collapses or expands the sidebar, as in most desktop apps.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "b" || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable=true]")) return; // keep bold shortcuts in editors
      event.preventDefault();
      toggleSidebar();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);
  // The file screen is edge to edge (stage + inspector); other pages use the padded column.
  const fullBleed = usePathname().startsWith("/files/");

  return (
    <div
      className={cn(
        "flex min-h-dvh flex-1 flex-col bg-background transition-[padding] duration-200 ease-out motion-reduce:transition-none",
        collapsed ? "lg:pl-[4.5rem]" : "lg:pl-64",
      )}
    >
      {/* ---------- Desktop sidebar (collapsible to an icon rail) ---------- */}
      <aside
        id="app-sidebar"
        aria-label="Sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 hidden bg-surface-muted shadow-soft transition-[width] duration-200 ease-out motion-reduce:transition-none lg:block",
          collapsed ? "w-[4.5rem]" : "w-64",
        )}
      >
        {/* Scrolls on short windows; the edge handle below stays outside it. */}
        <div className={cn("flex h-full flex-col justify-between gap-6 overflow-y-auto overflow-x-hidden", collapsed ? "px-3 py-4" : "p-4")}>
          <div className="flex flex-col gap-6">
            <div className={cn("flex items-center pt-1", collapsed ? "justify-center" : "justify-between px-1")}>
              <Link href="/" aria-label="QuickDrop home" className="inline-flex rounded-lg">
                <Logo markOnly={collapsed} />
              </Link>
            </div>
            <Suspense>
              <SidebarNav collapsed={collapsed} />
            </Suspense>
          </div>

          <div className="flex flex-col gap-3">
            <StorageCard storage={storage} variant={collapsed ? "mini" : "compact"} />
            <SidebarProfile name={userName} email={userEmail} collapsed={collapsed} />
          </div>
        </div>

        {/* Collapse / expand handle on the sidebar's edge. */}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-controls="app-sidebar"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar (⌘B)" : "Collapse sidebar (⌘B)"}
          className="absolute -right-3.5 top-7 z-10 grid size-7 place-items-center rounded-full bg-surface text-muted shadow-raised ring-1 ring-border transition-colors hover:text-foreground"
        >
          <Icon name={collapsed ? "chevronRight" : "back"} className="size-4" />
        </button>
      </aside>

      {/* ---------- Desktop top bar ---------- */}
      <header className="sticky top-0 z-40 hidden h-16 items-center justify-between gap-6 bg-surface-glass px-10 shadow-soft backdrop-blur-xl lg:flex">
        <SearchForm className="max-w-md flex-1" />
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-1.5">
            <AddItemButton size="sm" label="Add Link" />
            <UploadButton size="sm" label="Upload Files" />
          </div>
          <span className="mx-1 h-4 w-px bg-border-strong" aria-hidden="true" />
          <div className="flex items-center gap-1">
            <UploadsIndicator />
            <ShortcutsButton />
          </div>
        </div>
      </header>

      {/* ---------- Phone app bar ---------- */}
      <header className="sticky top-0 z-40 bg-surface-glass pt-safe shadow-soft backdrop-blur-xl lg:hidden">
        {mobileSearch ? (
          <div className="flex h-14 items-center gap-2 px-3">
            <SearchForm autoFocus />
            <Button variant="ghost" size="sm" onClick={() => setMobileSearch(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex h-14 items-center gap-1 px-4">
            <Link href="/" aria-label="QuickDrop home" className="mr-auto rounded-lg">
              <Logo size="sm" />
            </Link>
            <Button variant="ghost" size="icon-sm" aria-label="Search" onClick={() => setMobileSearch(true)}>
              <Icon name="search" className="size-5" />
            </Button>
            <UploadsIndicator />
            <div className="ml-1">
              <AccountMenu name={userName} email={userEmail} />
            </div>
          </div>
        )}
      </header>

      {/* Bottom padding keeps content clear of the phone tab bar. */}
      <main className={fullBleed ? "w-full flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0" : "w-full flex-1 pb-[calc(7.5rem+env(safe-area-inset-bottom))] lg:pb-12"}>
        {fullBleed ? (
          children
        ) : (
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-5 lg:px-10">{children}</div>
        )}
      </main>

      <Suspense>
        <MobileTabBar />
      </Suspense>
    </div>
  );
}
