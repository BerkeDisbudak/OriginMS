"use client";

import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DashboardApiProvider,
  useDashboardApprovedLeave,
  useDashboardCurrentUser,
  useDashboardEmployeeLookup,
  useDashboardEmployees,
  useDashboardPendingApprovals,
  useDashboardSession,
} from "@/api/dashboard";
import type { LeaveRequestResponse } from "@/api/generated/types.gen";
import {
  approvalStatusLabel,
  approvalStatusTone,
  formatRequestAge,
  leaveTypeLabel,
} from "@/domain/approval-inbox";
import {
  countNewHires,
  countOnLeaveToday,
  departmentLabel,
  groupByDepartment,
} from "@/domain/dashboard";
import { moveSelection } from "@/domain/lib/list-navigation";
import { cn } from "@/lib/cn";
import {
  StatusPill,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui";
import { HeroNumeral } from "@/ui/motion/hero-metric";

export function DashboardPage() {
  return (
    <DashboardApiProvider>
      <DashboardShell />
    </DashboardApiProvider>
  );
}

function DashboardShell() {
  const router = useRouter();
  const [demoUser] = useQueryState("demoUser");
  const session = useDashboardSession(demoUser);
  const isReady = session.tokenReady;
  const currentUser = useDashboardCurrentUser(isReady);

  const employees = useDashboardEmployees(isReady);
  const pending = useDashboardPendingApprovals(isReady);
  const approvedLeave = useDashboardApprovedLeave(isReady);

  const employeeList = useMemo(() => employees.data?.items ?? [], [employees.data]);
  const pendingList = useMemo(() => pending.data?.items ?? [], [pending.data]);
  const approvedList = useMemo(() => approvedLeave.data?.items ?? [], [approvedLeave.data]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const headcount = employeeList.length;
  const pendingCount = pendingList.length;
  const onLeaveToday = countOnLeaveToday(approvedList, today);
  const newHires = countNewHires(employeeList, today);

  const needsAttention = useMemo(() => pendingList.slice(0, 5), [pendingList]);
  const employeeLookup = useDashboardEmployeeLookup(
    needsAttention.map((request) => request.employee_id),
    isReady && needsAttention.length > 0,
  );

  const departments = useMemo(() => groupByDepartment(employeeList), [employeeList]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex >= needsAttention.length) {
      setActiveIndex(Math.max(0, needsAttention.length - 1));
    }
  }, [activeIndex, needsAttention.length]);

  const moveActive = useCallback(
    (direction: 1 | -1) => {
      setActiveIndex((current) => moveSelection(current, direction, needsAttention.length));
    },
    [needsAttention.length],
  );

  const goToInbox = useCallback(() => {
    router.push("/");
  }, [router]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const isTextInput =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      if (isTextInput) {
        return;
      }
      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        moveActive(1);
        return;
      }
      if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        moveActive(-1);
        return;
      }
      if (event.key === "Enter" && needsAttention.length > 0) {
        event.preventDefault();
        goToInbox();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moveActive, needsAttention.length, goToInbox]);

  const isLoading =
    session.isPending ||
    (isReady && (employees.isPending || pending.isPending || approvedLeave.isPending));

  const greetingName = currentUser.data?.email
    ? capitalize(currentUser.data.email.split("@")[0] ?? "")
    : "there";
  const greetingDate = useMemo(
    () =>
      // Fixed locale, not `undefined` -- the server process's locale can
      // differ from the browser's, causing a hydration mismatch.
      new Date().toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        weekday: "long",
      }),
    [],
  );

  return (
    <main className="min-h-screen bg-bg p-6 text-text-primary">
      <section className="mx-auto grid max-w-[1200px] gap-8">
        <div>
          <h1 className="text-page font-semibold leading-heading">
            {greetingForHour()}, {greetingName}
          </h1>
          <p className="mt-1 text-dense text-text-secondary">{greetingDate}</p>
        </div>

        {isLoading ? (
          <p className="text-base text-text-secondary">Loading...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              <HeroMetric label="Headcount" value={headcount} />
              <HeroMetric label="Pending approvals" value={pendingCount} />
              <HeroMetric label="On leave today" value={onLeaveToday} />
              <HeroMetric label="New hires (30d)" value={newHires} />
            </div>

            <div className="rounded-card border border-border bg-surface">
              <div className="border-b border-border p-5">
                <p className="text-meta font-medium tracking-label text-text-tertiary uppercase">
                  Needs attention
                </p>
                <h2 className="mt-1 text-section font-semibold leading-heading">
                  Pending approvals
                </h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requester</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Age</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {needsAttention.length ? (
                    needsAttention.map((request, index) => (
                      <NeedsAttentionRow
                        active={index === activeIndex}
                        employeeName={employeeDisplayName(
                          employeeLookup[request.employee_id],
                          request.employee_id,
                        )}
                        key={request.id}
                        onSelect={() => {
                          setActiveIndex(index);
                          goToInbox();
                        }}
                        request={request}
                      />
                    ))
                  ) : (
                    <tr>
                      <TableEmpty colSpan={3}>Nothing needs attention</TableEmpty>
                    </tr>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-card border border-border bg-surface p-5">
              <p className="text-meta font-medium tracking-label text-text-tertiary uppercase">
                Team status
              </p>
              <div className="mt-3 grid gap-3">
                {departments.map((department) => (
                  <div className="flex items-center justify-between" key={department.departmentId}>
                    <span className="text-base text-text-primary">
                      {departmentLabel(department.departmentId)}
                    </span>
                    <div className="flex gap-2">
                      <StatusPill compact label={`${department.active} active`} tone="success" />
                      {department.onLeave ? (
                        <StatusPill
                          compact
                          label={`${department.onLeave} on leave`}
                          tone="warning"
                        />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function HeroMetric({ label, value }: { label: string; value: number }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: role="group" is the correct ARIA widget-group semantic here; <fieldset> is for form controls, not a metric display.
    <div aria-label={label} className="border-t border-border pt-2" role="group">
      <p className="text-micro font-medium uppercase tracking-label text-text-tertiary">{label}</p>
      <div className="mt-1 text-[length:var(--text-hero-max)] font-semibold leading-none text-text-primary">
        <HeroNumeral value={value} />
      </div>
    </div>
  );
}

function NeedsAttentionRow({
  active,
  employeeName,
  onSelect,
  request,
}: {
  active: boolean;
  employeeName: string;
  onSelect: () => void;
  request: LeaveRequestResponse;
}) {
  return (
    <TableRow
      aria-selected={active}
      className={cn("cursor-pointer", active ? "bg-surface-raised" : "")}
      onClick={onSelect}
      tabIndex={0}
    >
      <TableCell>{employeeName}</TableCell>
      <TableCell>
        <div className="grid gap-2">
          <span>{leaveTypeLabel(request.type)}</span>
          <StatusPill
            compact
            label={approvalStatusLabel(request.status)}
            tone={approvalStatusTone(request.status)}
          />
        </div>
      </TableCell>
      <TableCell className="font-mono tabular-nums text-text-secondary">
        {formatRequestAge(request.created_at)}
      </TableCell>
    </TableRow>
  );
}

function employeeDisplayName(
  employee: { first_name: string; last_name: string } | undefined,
  fallback: string,
): string {
  return employee ? `${employee.first_name} ${employee.last_name}` : fallback;
}

function capitalize(value: string): string {
  return value.length ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function greetingForHour(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
}
