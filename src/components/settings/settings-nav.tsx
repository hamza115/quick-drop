"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export interface SettingsNavItem {
  id: string;
  label: string;
  icon: IconName;
}

/**
 * Section navigation. Large screens: a sticky vertical list beside the content. Phones and tablets:
 * a sticky row of pills under the app bar that scrolls sideways. The active item follows scrolling.
 */
export function SettingsNav({ items }: { items: SettingsNavItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);
    // A section counts as current once its top passes 30% of the window height.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  // Keep the active pill in view on phones.
  useEffect(() => {
    document.getElementById(`settings-pill-${active}`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active]);

  return (
    <>
      {/* Phones and tablets */}
      <nav
        aria-label="Settings sections"
        className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-5 bg-background/90 px-5 py-2 backdrop-blur-xl lg:hidden"
      >
        <ul className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {items.map((item) => (
            <li key={item.id} className="shrink-0">
              <a
                id={`settings-pill-${item.id}`}
                href={`#${item.id}`}
                onClick={() => setActive(item.id)}
                aria-current={active === item.id ? "true" : undefined}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                  active === item.id ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted",
                )}
              >
                <Icon name={item.icon} className="size-4" />
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Large screens */}
      <nav aria-label="Settings sections" className="sticky top-24 hidden self-start lg:block">
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={() => setActive(item.id)}
                aria-current={active === item.id ? "true" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-body transition-colors",
                  active === item.id
                    ? "bg-surface font-semibold text-foreground shadow-card"
                    : "text-muted hover:bg-surface-muted hover:text-foreground",
                )}
              >
                <Icon name={item.icon} className="size-[18px]" />
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
