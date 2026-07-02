"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  helpText?: string;
  label: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
};

export function Input({
  className,
  error,
  helpText,
  id,
  label,
  prefix,
  suffix,
  ...props
}: InputProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replaceAll(" ", "-");
  const describedBy = error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined;

  return (
    <label className="grid gap-2 text-meta font-medium text-text-secondary" htmlFor={inputId}>
      <span>{label}</span>
      <span className="relative flex h-9 items-center rounded-control border border-border-strong bg-surface text-text-primary transition-colors duration-fast ease-out focus-within:border-accent focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
        {prefix ? (
          <span className="ml-3 flex size-4 items-center text-text-tertiary">{prefix}</span>
        ) : null}
        <input
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent px-3 text-base text-text-primary outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          id={inputId}
          {...props}
        />
        {suffix ? (
          <span className="mr-3 flex size-4 items-center text-text-tertiary">{suffix}</span>
        ) : null}
      </span>
      {error ? (
        <span className="text-meta font-medium text-danger" id={`${inputId}-error`} role="alert">
          {error}
        </span>
      ) : helpText ? (
        <span className="text-meta font-regular text-text-tertiary" id={`${inputId}-help`}>
          {helpText}
        </span>
      ) : null}
    </label>
  );
}
