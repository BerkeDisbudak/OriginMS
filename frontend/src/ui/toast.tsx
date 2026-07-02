"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { ToastMotion } from "./motion/toast-motion";

type ToastTone = "danger" | "info" | "success" | "warning";

export type ToastOptions = {
  action?: {
    label: string;
    onClick: () => void;
  };
  description?: string;
  title: string;
  tone?: ToastTone;
};

type ToastState = ToastOptions & {
  id: number;
};

type ToastContextValue = {
  dismissToast: () => void;
  showToast: (toast: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClasses: Record<ToastTone, string> = {
  success: "border-success/40",
  warning: "border-warning/40",
  danger: "border-danger/40",
  info: "border-accent/40",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const dismissToast = useCallback(() => setToast(null), []);
  const showToast = useCallback((nextToast: ToastOptions) => {
    const id = Date.now();
    setToast({ id, tone: "info", ...nextToast });
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ dismissToast, showToast }), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-6 left-6 z-50 w-80 max-w-[calc(100vw-var(--space-12))]"
      >
        {toast ? (
          <ToastMotion
            className={cn(
              "rounded-card border bg-surface-raised p-4 text-text-primary shadow-overlay",
              toneClasses[toast.tone ?? "info"],
            )}
            role="status"
          >
            <div className="grid gap-1">
              <p className="m-0 text-base font-semibold">{toast.title}</p>
              {toast.description ? (
                <p className="m-0 text-meta text-text-secondary">{toast.description}</p>
              ) : null}
            </div>
            {toast.action ? (
              <div className="mt-3">
                <Button
                  onClick={() => {
                    toast.action?.onClick();
                    dismissToast();
                  }}
                  size="sm"
                  variant="secondary"
                >
                  {toast.action.label}
                </Button>
              </div>
            ) : null}
          </ToastMotion>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
