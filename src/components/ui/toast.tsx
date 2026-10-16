"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type Tone = "success" | "error";

interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
}

interface ToastContextValue {
  show: (message: string, tone?: Tone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const TOAST_DURATION_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, tone: Tone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  // Memoised so consumers do not re-render on every toast.
  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext value={value}>
      {children}
      {/* Above the phone tab bar; bottom-right on larger screens. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-nav-offset z-[60] flex flex-col items-center gap-2 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:items-end"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={cn(
              "flex w-full max-w-sm animate-toast-in items-start gap-2.5 rounded-2xl px-4 py-3 text-sm shadow-float",
              toast.tone === "error"
                ? "border border-danger/25 bg-surface text-foreground"
                : "bg-foreground text-background",
            )}
          >
            <Icon
              name={toast.tone === "error" ? "alert" : "check"}
              className={cn("mt-px size-4", toast.tone === "error" ? "text-danger" : "text-background")}
            />
            <span className="min-w-0 flex-1">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
