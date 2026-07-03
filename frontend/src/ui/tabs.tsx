"use client";

import type { ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";
import { TabContentMotion, TabIndicator } from "./motion/tabs-motion";

export type TabItem = {
  id: string;
  label: string;
};

export type TabsProps = {
  activeId: string;
  children: ReactNode;
  items: TabItem[];
  onActiveIdChange: (id: string) => void;
};

export function Tabs({ activeId, children, items, onActiveIdChange }: TabsProps) {
  const indicatorLayoutId = useId();

  return (
    <div>
      <div aria-label="Tabs" className="flex gap-6 border-b border-border" role="tablist">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              aria-selected={active}
              className={cn(
                "relative pb-3 text-base font-medium outline-none transition-[color,background-color,border-color] duration-fast ease-out",
                "focus-visible:focus-ring",
                active ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
              )}
              id={`tab-${item.id}`}
              key={item.id}
              onClick={() => onActiveIdChange(item.id)}
              role="tab"
              type="button"
            >
              {item.label}
              {active ? <TabIndicator layoutId={indicatorLayoutId} /> : null}
            </button>
          );
        })}
      </div>
      <div aria-labelledby={`tab-${activeId}`} className="pt-4" role="tabpanel">
        <TabContentMotion activeId={activeId}>{children}</TabContentMotion>
      </div>
    </div>
  );
}
