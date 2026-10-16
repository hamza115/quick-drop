"use client";

import { useSelection } from "@/components/library/selection";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";

export function SelectToggle({ disabled = false }: { disabled?: boolean }) {
  const { selecting, start, stop } = useSelection();
  return (
    <Button
      variant={selecting ? "soft" : "secondary"}
      size="sm"
      aria-pressed={selecting}
      onClick={() => (selecting ? stop() : start())}
      disabled={disabled}
      className="h-8 gap-1.5 rounded-lg px-2.5 text-[13px] sm:px-3"
    >
      <Icon name="select" className="size-4" />
      <span className="hidden sm:inline">{selecting ? "Done" : "Select"}</span>
      <span className="sr-only sm:hidden">{selecting ? "Stop selecting" : "Select items"}</span>
    </Button>
  );
}
