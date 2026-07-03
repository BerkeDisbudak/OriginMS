import type { EmployeeResponse, EmployeeStatus } from "@/api/generated/types.gen";

export type StatusTone = "danger" | "info" | "neutral" | "success" | "warning";

export function employeeStatusTone(status: EmployeeStatus): StatusTone {
  const tones: Record<EmployeeStatus, StatusTone> = {
    active: "success",
    on_leave: "warning",
    terminated: "neutral",
  };
  return tones[status];
}

export function employeeStatusLabel(status: EmployeeStatus): string {
  const labels: Record<EmployeeStatus, string> = {
    active: "Active",
    on_leave: "On leave",
    terminated: "Terminated",
  };
  return labels[status];
}

export function employeeFullName(
  employee: Pick<EmployeeResponse, "first_name" | "last_name">,
): string {
  return `${employee.first_name} ${employee.last_name}`;
}

export function employeeInitials(
  employee: Pick<EmployeeResponse, "first_name" | "last_name">,
): string {
  return `${employee.first_name.charAt(0)}${employee.last_name.charAt(0)}`.toUpperCase();
}
