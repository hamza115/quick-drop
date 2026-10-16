"use client";

import { useCallback, useRef, type MouseEvent, type PointerEvent } from "react";

const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE_PX = 10;

/**
 * Press-and-hold on touch screens, like selecting photos in a gallery app. The click that follows
 * a long press is swallowed, so the item doesn't also open. Mouse users use the Select button.
 */
export function useLongPress(onLongPress: () => void) {
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  }, []);

  const onPointerDown = useCallback(
    (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      fired.current = false;
      start.current = { x: event.clientX, y: event.clientY };
      timer.current = window.setTimeout(() => {
        fired.current = true;
        navigator.vibrate?.(10);
        onLongPress();
      }, LONG_PRESS_MS);
    },
    [onLongPress],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!start.current) return;
      const moved = Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y);
      if (moved > MOVE_TOLERANCE_PX) cancel(); // scrolling, not pressing
    },
    [cancel],
  );

  const onClickCapture = useCallback((event: MouseEvent) => {
    if (fired.current) {
      event.preventDefault();
      event.stopPropagation();
      fired.current = false;
    }
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onClickCapture,
    // Stops the phone's own long-press menu (copy link, open in new tab) from appearing.
    onContextMenu: (event: MouseEvent) => {
      if (fired.current || timer.current !== null) event.preventDefault();
    },
  };
}
