import { cn } from "@/lib/cn";

type StatusTone = "danger" | "info" | "neutral" | "success" | "warning";

export type StatusPillProps = {
  className?: string;
  compact?: boolean;
  label: string;
  tone?: StatusTone;
};

const toneClasses: Record<StatusTone, string> = {
  neutral: "bg-surface-raised text-text-secondary [--pill-dot:var(--text-tertiary)]",
  success: "bg-success/10 text-text-primary [--pill-dot:var(--success)]",
  warning: "bg-warning/10 text-text-primary [--pill-dot:var(--warning)]",
  danger: "bg-danger/10 text-text-primary [--pill-dot:var(--danger)]",
  info: "bg-accent-subtle text-text-primary [--pill-dot:var(--accent)]",
};

export function StatusPill({
  className,
  compact = false,
  label,
  tone = "neutral",
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill font-medium",
        compact ? "gap-1 px-2 py-1 text-meta" : "gap-2 px-3 py-1 text-meta",
        toneClasses[tone],
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-pill bg-[var(--pill-dot)]" />
      {label}
    </span>
  );
}
