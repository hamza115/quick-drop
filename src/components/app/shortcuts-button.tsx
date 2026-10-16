"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icons";

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["⌘", "K"], label: "Search (Ctrl+K on Windows), or press /" },
  { keys: ["⌘", "V"], label: "Paste a screenshot, file or link anywhere outside a text field" },
  { keys: ["⌘", "B"], label: "Collapse or expand the sidebar (Ctrl+B on Windows)" },
  { keys: ["Drop"], label: "Drag files onto the window to upload them" },
  { keys: ["Esc"], label: "Close a dialog or menu" },
];

/** The "info" button in the top bar: how to move fast in QuickDrop. */
export function ShortcutsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Keyboard shortcuts and tips"
        title="Shortcuts"
        className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-container hover:text-foreground"
      >
        <Icon name="info" className="size-5" />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Shortcuts" description="Ways to save and find things faster.">
        <ul className="divide-y divide-border">
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.label} className="flex items-center justify-between gap-4 py-3">
              <span className="text-body text-foreground">{shortcut.label}</span>
              <span className="flex shrink-0 gap-1">
                {shortcut.keys.map((key) => (
                  <kbd key={key} className="min-w-6 rounded bg-surface-highest px-1.5 py-0.5 text-center font-sans text-[11px] font-semibold text-foreground">
                    {key}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}
