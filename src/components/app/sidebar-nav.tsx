"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { FileTypeIcon } from "@/components/library/file-type-icon";
import { Icon } from "@/components/ui/icons";
import { TYPE_FILTER_LABELS } from "@/lib/files/constants";
import { cn } from "@/lib/cn";

interface SidebarNavProps {
  onNavigate?: () => void;
  /** Icon-only rail: labels become tooltips and screen-reader text. */
  collapsed?: boolean;
}

const ICON = "size-5";

const NAV_ITEMS = [
  { href: "/", label: "All Files", icon: <Icon name="folderOpen" className={ICON} />, match: { type: "all", favorites: false } },
  { href: "/?type=image", label: TYPE_FILTER_LABELS.image, icon: <FileTypeIcon kind="image" className={ICON} />, match: { type: "image", favorites: false } },
  { href: "/?type=video", label: TYPE_FILTER_LABELS.video, icon: <FileTypeIcon kind="video" className={ICON} />, match: { type: "video", favorites: false } },
  { href: "/?type=document", label: TYPE_FILTER_LABELS.document, icon: <FileTypeIcon kind="document" className={ICON} />, match: { type: "document", favorites: false } },
  { href: "/?type=links", label: "Links & Notes", icon: <Icon name="link" className={ICON} />, match: { type: "links", favorites: false } },
  { href: "/?favorites=1", label: "Favorites", icon: <Icon name="star" className={ICON} />, match: { type: "all", favorites: true } },
] as const;

/** Sidebar link look from the design: quiet text, and a solid black pill for the active item. */
export function sidebarLinkClasses(active: boolean, collapsed = false): string {
  return cn(
    "flex items-center gap-3 rounded-lg px-3 py-2 text-body transition-all",
    collapsed && "mx-auto size-11 justify-center gap-0 px-0 py-0",
    active
      ? "bg-primary font-bold text-primary-foreground shadow-soft"
      : "text-muted hover:bg-surface-high hover:text-foreground",
  );
}

export function SidebarNav({ onNavigate, collapsed = false }: SidebarNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type") ?? "all";
  const favorites = searchParams.get("favorites") === "1";
  const onLibrary = pathname === "/";

  return (
    <nav aria-label="Library">
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = onLibrary && item.match.favorites === favorites && item.match.type === currentType;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={sidebarLinkClasses(active, collapsed)}
              >
                {item.icon}
                <span className={collapsed ? "sr-only" : undefined}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
