"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "danger" | "ghost" | "primary" | "secondary";
type ButtonSize = "md" | "sm";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  leadingIcon?: ReactNode;
  loading?: boolean;
  size?: ButtonSize;
  trailingIcon?: ReactNode;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border-accent bg-accent text-text-primary hover:bg-accent/90",
  secondary: "border-border bg-surface text-text-primary hover:bg-surface-raised",
  ghost: "border-transparent bg-transparent text-text-secondary hover:text-text-primary",
  danger: "border-danger bg-transparent text-danger hover:bg-danger/10 hover:text-text-primary",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-meta",
  md: "h-9 px-4 text-base",
};

export function Button({
  children,
  className,
  disabled,
  leadingIcon,
  loading = false,
  size = "md",
  trailingIcon,
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-control border font-medium transition-colors duration-fast ease-out",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      disabled={isDisabled}
      type={type}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-3 rounded-pill border border-current border-t-transparent"
        />
      ) : (
        leadingIcon
      )}
      <span>{children}</span>
      {trailingIcon}
    </button>
  );
}
