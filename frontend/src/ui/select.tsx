"use client";

import { CaretDown } from "@phosphor-icons/react";
import type { KeyboardEvent } from "react";
import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

export type SelectItem = {
  disabled?: boolean;
  label: string;
  value: string;
};

export type SelectProps = {
  disabled?: boolean;
  error?: string;
  items: SelectItem[];
  label: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  value?: string;
};

export function Select({
  disabled = false,
  error,
  items,
  label,
  onValueChange,
  placeholder = "Select",
  value,
}: SelectProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedItem = useMemo(() => items.find((item) => item.value === value), [items, value]);

  function commit(index: number) {
    const item = items[index];
    if (!item || item.disabled) return;
    onValueChange(item.value);
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, items.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.max(current - 1, 0));
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open ? commit(activeIndex) : setOpen(true);
    }
    if (event.key === "Escape") {
      setOpen(false);
    }
    if (event.key.length === 1) {
      const next = items.findIndex((item) =>
        item.label.toLowerCase().startsWith(event.key.toLowerCase()),
      );
      if (next >= 0) {
        setActiveIndex(next);
        setOpen(true);
      }
    }
  }

  return (
    <div className="relative grid gap-2">
      <span className="text-meta font-medium text-text-secondary" id={`${id}-label`}>
        {label}
      </span>
      <button
        aria-controls={`${id}-listbox`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={`${id}-label ${id}-value`}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-control border border-border-strong bg-surface px-3 text-left text-base text-text-primary transition-colors duration-fast ease-out",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          disabled && "cursor-not-allowed opacity-50",
          error && "border-danger",
        )}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onKeyDown}
        type="button"
      >
        <span className={cn(!selectedItem && "text-text-tertiary")} id={`${id}-value`}>
          {selectedItem?.label ?? placeholder}
        </span>
        <span aria-hidden="true" className="text-text-tertiary">
          <CaretDown size={16} />
        </span>
      </button>
      {open ? (
        <div
          aria-labelledby={`${id}-label`}
          className="absolute top-full z-20 mt-2 max-h-64 w-full overflow-auto rounded-control border border-border bg-surface-raised py-1 shadow-overlay"
          id={`${id}-listbox`}
          role="listbox"
        >
          {items.map((item, index) => (
            <button
              aria-disabled={item.disabled}
              aria-selected={item.value === value}
              className={cn(
                "block w-full cursor-pointer px-3 py-2 text-left text-base text-text-primary transition-colors duration-fast ease-out",
                index === activeIndex && "bg-accent-subtle",
                item.disabled && "cursor-not-allowed opacity-50",
              )}
              id={`${id}-option-${item.value}`}
              key={item.value}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                commit(index);
              }}
              role="option"
              tabIndex={-1}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      {error ? (
        <span className="text-meta font-medium text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
