"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AddSheet } from "@/components/app/add-sheet";
import { Icon, type IconName } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type Tab = { href: string; label: string; icon: IconName; isActive: (path: string, params: { get(name: string): string | null }) => boolean };

const TABS_BEFORE: Tab[] = [
  {
    href: "/",
    label: "Files",
    icon: "folderOpen",
    isActive: (path, params) => path === "/" && params.get("favorites") !== "1" && params.get("type") !== "links",
  },
  { href: "/?favorites=1", label: "Favorites", icon: "star", isActive: (path, params) => path === "/" && params.get("favorites") === "1" },
];

const TABS_AFTER: Tab[] = [
  { href: "/?type=links", label: "Links", icon: "link", isActive: (path, params) => path === "/" && params.get("type") === "links" },
  { href: "/settings", label: "Settings", icon: "settings", isActive: (path) => path.startsWith("/settings") },
];

/** Phone navigation: four tabs and a raised "+" in the middle, like a native app. Hidden on large screens. */
export function MobileTabBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [adding, setAdding] = useState(false);

  function renderTab(tab: Tab) {
    const active = tab.isActive(pathname, searchParams);
    return (
      <li key={tab.href} className="flex-1">
        <Link
          href={tab.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex h-14 flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-medium transition-colors",
            active ? "font-bold text-foreground" : "text-muted active:text-foreground",
          )}
        >
          <Icon name={tab.icon} filled={active && tab.icon === "star"} className={cn("size-6", active && "stroke-[2.1]")} />
          {tab.label}
        </Link>
      </li>
    );
  }

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 bg-surface-glass pb-safe shadow-[0_-1px_8px_rgb(0_0_0/0.04)] backdrop-blur-xl lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-stretch px-2">
          {TABS_BEFORE.map(renderTab)}
          <li className="flex flex-1 items-start justify-center">
            <button
              type="button"
              onClick={() => setAdding(true)}
              aria-haspopup="dialog"
              aria-label="Add files, photos, links or notes"
              className="-mt-6 grid size-14 place-items-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-raised transition-transform active:scale-95"
            >
              <Icon name="plus" className="size-7 stroke-[2.25]" />
            </button>
          </li>
          {TABS_AFTER.map(renderTab)}
        </ul>
      </nav>
      <AddSheet open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
