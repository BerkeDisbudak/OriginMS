import type { EmployeeResponse } from "@/api/generated/types.gen";
import { employeeInitials } from "@/domain/employees";
import { cn } from "@/lib/cn";

export function EmployeeAvatar({
  className,
  employee,
  size,
}: {
  className?: string;
  employee: Pick<EmployeeResponse, "first_name" | "last_name">;
  size: 28 | 40;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-pill bg-accent-subtle font-semibold text-accent",
        size === 28 ? "size-7 text-meta" : "size-10 text-base",
        className,
      )}
    >
      {employeeInitials(employee)}
    </div>
  );
}
