"use client";

import { Command } from "cmdk";
import { cn } from "@/lib/cn";
import { PaletteMotion } from "./motion/palette-motion";

export type PaletteItem = {
  id: string;
  label: string;
  shortcut?: string;
};

export type PaletteSection = {
  id: string;
  items: PaletteItem[];
  label: string;
};

export type PaletteProps = {
  onOpenChange: (open: boolean) => void;
  onSelect: (item: PaletteItem) => void;
  open: boolean;
  sections: PaletteSection[];
};

export function Palette({ onOpenChange, onSelect, open, sections }: PaletteProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close command palette"
        className="absolute inset-0 bg-bg/40"
        onClick={() => onOpenChange(false)}
        type="button"
      />
      <PaletteMotion
        className="absolute left-1/2 top-8 w-[min(640px,calc(100vw-var(--space-12)))] -translate-x-1/2 rounded-panel border border-border bg-surface-raised p-2 shadow-pop"
        open={open}
      >
        <Command className="grid gap-2" label="Command palette">
          <Command.Input
            autoFocus
            className="h-10 rounded-control border border-border-strong bg-surface px-3 text-base text-text-primary outline-none placeholder:text-text-tertiary focus-visible:focus-ring"
            placeholder="Search"
          />
          <Command.List className="max-h-96 overflow-auto">
            <Command.Empty className="px-3 py-6 text-center text-base text-text-secondary">
              No results
            </Command.Empty>
            {sections.map((section) => (
              <Command.Group
                className="py-2 text-meta text-text-tertiary [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-label"
                heading={section.label}
                key={section.id}
              >
                {section.items.map((item) => (
                  <Command.Item
                    className={cn(
                      "flex h-9 cursor-pointer items-center justify-between rounded-control px-3 text-base text-text-primary",
                      "data-[selected=true]:bg-accent-subtle",
                    )}
                    key={item.id}
                    onSelect={() => {
                      onSelect(item);
                      onOpenChange(false);
                    }}
                    value={item.label}
                  >
                    <span>{item.label}</span>
                    {item.shortcut ? (
                      <kbd className="font-mono text-meta text-text-tertiary">{item.shortcut}</kbd>
                    ) : null}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </PaletteMotion>
    </div>
  );
}
