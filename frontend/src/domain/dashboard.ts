import type { EmployeeResponse, LeaveRequestResponse } from "@/api/generated/types.gen";

export function countNewHires(
  employees: EmployeeResponse[],
  todayIso: string,
  windowDays = 30,
): number {
  const todayMs = new Date(`${todayIso}T00:00:00Z`).getTime();
  const cutoffMs = todayMs - windowDays * 24 * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoffMs).toISOString().slice(0, 10);
  return employees.filter((employee) => employee.hire_date >= cutoffIso).length;
}

export function countOnLeaveToday(
  approvedRequests: LeaveRequestResponse[],
  todayIso: string,
): number {
  return approvedRequests.filter(
    (request) => request.start_date <= todayIso && todayIso <= request.end_date,
  ).length;
}

export function departmentLabel(departmentId: string): string {
  const name = departmentId.replace(/^dep_/, "");
  return name.length ? name.charAt(0).toUpperCase() + name.slice(1) : departmentId;
}

export function groupByDepartment(
  employees: EmployeeResponse[],
): { departmentId: string; active: number; onLeave: number }[] {
  const groups = new Map<string, { active: number; onLeave: number }>();
  for (const employee of employees) {
    const group = groups.get(employee.department_id) ?? { active: 0, onLeave: 0 };
    if (employee.status === "active") {
      group.active += 1;
    } else if (employee.status === "on_leave") {
      group.onLeave += 1;
    }
    groups.set(employee.department_id, group);
  }
  return [...groups.entries()]
    .map(([departmentId, counts]) => ({ departmentId, ...counts }))
    .sort((a, b) => a.departmentId.localeCompare(b.departmentId));
}
