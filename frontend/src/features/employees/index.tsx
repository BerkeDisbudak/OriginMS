"use client";

import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmployeesApiProvider, useEmployeesDemoSession, useEmployeesList } from "@/api/employees";
import type { EmployeePage, EmployeeResponse } from "@/api/generated/types.gen";
import { employeeFullName, employeeStatusLabel, employeeStatusTone } from "@/domain/employees";
import { moveSelection } from "@/domain/lib/list-navigation";
import { EmployeeProfilePanel } from "@/features/employee-profile";
import { cn } from "@/lib/cn";
import {
  Button,
  StatusPill,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui";

export function EmployeesDirectoryPage() {
  return (
    <EmployeesApiProvider>
      <EmployeesDirectoryShell />
    </EmployeesApiProvider>
  );
}

function EmployeesDirectoryShell() {
  const [demoUser] = useQueryState("demoUser");
  const session = useEmployeesDemoSession(demoUser);
  const isReady = session.tokenReady;

  const [panelEmployeeId, setPanelEmployeeId] = useQueryState("panel");
  const [cursor, setCursor] = useState<string | null>(null);
  const [pages, setPages] = useState<EmployeePage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const employees = useEmployeesList(isReady, cursor);

  const allEmployees = useMemo(() => pages.flatMap((page) => page.items), [pages]);

  useEffect(() => {
    if (!employees.data) {
      return;
    }
    const page = employees.data;
    setPages((currentPages) => {
      if (!cursor) {
        return [page];
      }
      if (
        currentPages.some((itemPage) =>
          itemPage.items.some((item) => item.id === page.items[0]?.id),
        )
      ) {
        return currentPages;
      }
      return [...currentPages, page];
    });
  }, [cursor, employees.data]);

  useEffect(() => {
    if (allEmployees.length === 0) {
      return;
    }
    if (activeIndex < 0) {
      setActiveIndex(0);
      return;
    }
    if (activeIndex >= allEmployees.length) {
      setActiveIndex(allEmployees.length - 1);
    }
  }, [activeIndex, allEmployees.length]);

  const moveActive = useCallback(
    (direction: 1 | -1) => {
      setActiveIndex((current) => moveSelection(current, direction, allEmployees.length));
    },
    [allEmployees.length],
  );

  const openActive = useCallback(() => {
    const active = allEmployees[activeIndex];
    if (active) {
      void setPanelEmployeeId(active.id);
    }
  }, [activeIndex, allEmployees, setPanelEmployeeId]);

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
      if (event.key === "Enter") {
        event.preventDefault();
        openActive();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moveActive, openActive]);

  const isLoading = session.isPending || (isReady && employees.isPending);
  const hasNextPage = Boolean(pages.at(-1)?.page.next_cursor);

  return (
    <main className="min-h-screen bg-bg p-6 text-text-primary">
      <section className="mx-auto grid max-w-[900px] gap-6">
        <div>
          <p className="text-meta font-medium tracking-label text-text-tertiary uppercase">
            Directory
          </p>
          <h1 className="mt-1 text-page font-semibold leading-heading">Employees</h1>
        </div>
        <div className="rounded-card border border-border bg-surface">
          {isLoading ? (
            <p className="p-5 text-base text-text-secondary">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allEmployees.length ? (
                  allEmployees.map((employee, index) => (
                    <EmployeeRow
                      active={index === activeIndex}
                      employee={employee}
                      key={employee.id}
                      onSelect={() => {
                        setActiveIndex(index);
                        void setPanelEmployeeId(employee.id);
                      }}
                    />
                  ))
                ) : (
                  <tr>
                    <TableEmpty colSpan={3}>No employees found</TableEmpty>
                  </tr>
                )}
              </TableBody>
            </Table>
          )}
          <div className="border-t border-border p-4">
            <Button
              disabled={!hasNextPage || employees.isFetching}
              onClick={() => {
                const nextCursor = pages.at(-1)?.page.next_cursor;
                if (nextCursor) {
                  setCursor(nextCursor);
                }
              }}
              size="sm"
            >
              {employees.isFetching && cursor ? "Loading..." : "Load more"}
            </Button>
          </div>
        </div>
      </section>
      <EmployeeProfilePanel
        employeeId={panelEmployeeId}
        onClose={() => void setPanelEmployeeId(null)}
      />
    </main>
  );
}

function EmployeeRow({
  active,
  employee,
  onSelect,
}: {
  active: boolean;
  employee: EmployeeResponse;
  onSelect: () => void;
}) {
  return (
    <TableRow
      aria-selected={active}
      className={cn(
        "cursor-pointer outline-none",
        "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
        active ? "bg-surface-raised" : "",
      )}
      onClick={onSelect}
      tabIndex={0}
    >
      <TableCell>{employeeFullName(employee)}</TableCell>
      <TableCell>{employee.title}</TableCell>
      <TableCell>
        <StatusPill
          compact
          label={employeeStatusLabel(employee.status)}
          tone={employeeStatusTone(employee.status)}
        />
      </TableCell>
    </TableRow>
  );
}
