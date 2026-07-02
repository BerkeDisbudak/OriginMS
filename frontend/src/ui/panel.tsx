"use client";

import { X } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { PanelMotion } from "./motion/panel-motion";

export type PanelProps = {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  status?: ReactNode;
  title: string;
};

export function Panel({
  actions,
  children,
  className,
  footer,
  onOpenChange,
  open,
  status,
  title,
}: PanelProps) {
  return (
    <div
      aria-hidden={!open}
      className={cn("fixed inset-0 z-40", open ? "pointer-events-auto" : "pointer-events-none")}
    >
      <button
        aria-label="Close panel"
        className={cn(
          "absolute inset-0 bg-bg/40 transition-opacity duration-fast ease-out",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={() => onOpenChange(false)}
        type="button"
      />
      <PanelMotion
        aria-label={title}
        className={cn(
          "absolute right-0 top-0 flex h-dvh w-full max-w-[420px] flex-col border-l border-border bg-surface shadow-overlay",
          className,
        )}
        open={open}
        role="dialog"
      >
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-5">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-section font-semibold text-text-primary">{title}</h2>
          </div>
          {status}
          {actions}
          <Button
            aria-label="Close panel"
            onClick={() => onOpenChange(false)}
            size="sm"
            variant="ghost"
          >
            <X aria-hidden="true" size={16} />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-5">{children}</div>
        {footer ? <footer className="border-t border-border p-5">{footer}</footer> : null}
      </PanelMotion>
    </div>
  );
}
