"use client";

import { DotsThree } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useEmployeeProfile, useEmployeesCurrentUser } from "@/api/employees";
import {
  employeeFullName,
  employeeInitials,
  employeeStatusLabel,
  employeeStatusTone,
} from "@/domain/employees";
import { Button, Panel, StatusPill, Tabs } from "@/ui";
import { OverviewTab } from "./overview-tab";

type TabId = "overview" | "employment" | "time" | "documents";

const tabItems = [
  { id: "overview", label: "Overview" },
  { id: "employment", label: "Employment" },
  { id: "time", label: "Time" },
  { id: "documents", label: "Documents" },
];

export function EmployeeProfilePanel({
  employeeId,
  onClose,
}: {
  employeeId: string | null;
  onClose: () => void;
}) {
  const open = employeeId !== null;
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    setActiveTab("overview");
    setEditOpen(false);
  }, [employeeId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const currentUser = useEmployeesCurrentUser(open);
  const profile = useEmployeeProfile(employeeId ?? undefined, open);
  const employee = profile.data;
  const canEdit = currentUser.data?.role === "hr_admin";

  return (
    <Panel
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
      open={open}
      title={employee ? employeeFullName(employee) : "Employee"}
    >
      {employee ? (
        <>
          <div className="flex items-center gap-3 border-b border-border pb-5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-accent-subtle text-base font-semibold text-accent">
              {employeeInitials(employee)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-section font-semibold text-text-primary">
                {employeeFullName(employee)}
              </p>
              <p className="truncate text-meta text-text-secondary">
                {employee.title} &middot; {employee.department_id}
              </p>
            </div>
            <StatusPill
              label={employeeStatusLabel(employee.status)}
              tone={employeeStatusTone(employee.status)}
            />
            {canEdit ? (
              <Button onClick={() => setEditOpen(true)} size="sm" variant="secondary">
                Edit
              </Button>
            ) : null}
            <Button aria-label="More actions" size="sm" variant="ghost">
              <DotsThree aria-hidden="true" size={16} />
            </Button>
          </div>
          <div className="pt-5">
            <Tabs
              activeId={activeTab}
              items={tabItems}
              onActiveIdChange={(id) => setActiveTab(id as TabId)}
            >
              {activeTab === "overview" ? (
                <OverviewTab
                  canEdit={canEdit}
                  editOpen={editOpen}
                  employee={employee}
                  onEditOpenChange={setEditOpen}
                />
              ) : (
                <PlaceholderTab
                  label={tabItems.find((item) => item.id === activeTab)?.label ?? ""}
                />
              )}
            </Tabs>
          </div>
        </>
      ) : (
        <p className="text-base text-text-secondary">Loading...</p>
      )}
    </Panel>
  );
}

function PlaceholderTab({ label }: { label: string }) {
  return <p className="text-base text-text-secondary">{label} details are coming soon.</p>;
}
