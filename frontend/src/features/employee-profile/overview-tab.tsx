"use client";

import { useState } from "react";
import {
  useEmployeeLeaveBalance,
  useEmployeeLeaveHistory,
  useUpdateEmployee,
} from "@/api/employees";
import type { EmployeeResponse } from "@/api/generated/types.gen";
import { approvalStatusLabel, approvalStatusTone, leaveTypeLabel } from "@/domain/approval-inbox";
import { problemDetail, problemFieldMessage } from "@/domain/lib/problem";
import { Button, Input, StatusPill, useToast } from "@/ui";

export function OverviewTab({
  canEdit,
  editOpen,
  employee,
  onEditOpenChange,
}: {
  canEdit: boolean;
  editOpen: boolean;
  employee: EmployeeResponse;
  onEditOpenChange: (open: boolean) => void;
}) {
  const balance = useEmployeeLeaveBalance(employee.id, true);
  const history = useEmployeeLeaveHistory(employee.id, true);
  const updateMutation = useUpdateEmployee();
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState(employee.title);

  async function handleSave() {
    setInlineError(null);
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({
        body: { title: titleDraft },
        path: { employee_id: employee.id },
      });
      showToast({ title: "Saved", tone: "success" });
      onEditOpenChange(false);
    } catch (error) {
      setInlineError(problemFieldMessage(error, "title") ?? problemDetail(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      {canEdit && editOpen ? (
        <div className="grid gap-3 rounded-card border border-border bg-surface-raised p-4">
          <Input
            label="Title"
            onChange={(event) => setTitleDraft(event.target.value)}
            value={titleDraft}
          />
          {inlineError ? (
            <p className="text-meta text-danger" role="alert">
              {inlineError}
            </p>
          ) : null}
          <div className="flex gap-3">
            <Button
              loading={isSaving}
              onClick={() => void handleSave()}
              size="sm"
              variant="primary"
            >
              Save
            </Button>
            <Button
              disabled={isSaving}
              onClick={() => onEditOpenChange(false)}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="rounded-card border border-border p-4">
        <p className="text-meta font-medium tracking-label text-text-tertiary uppercase">
          Leave balance
        </p>
        <p className="mt-2 text-base text-text-primary">
          {balance.data ? `${balance.data.remaining} days remaining` : "Loading..."}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <p className="text-meta font-medium tracking-label text-text-tertiary uppercase">
            Recent leave history
          </p>
          <Button size="sm" variant="ghost">
            View all &rarr;
          </Button>
        </div>
        <ul className="mt-2 grid gap-2">
          {history.data?.items.length ? (
            history.data.items.map((item) => (
              <li className="flex items-center justify-between text-base" key={item.id}>
                <span>{leaveTypeLabel(item.type)}</span>
                <StatusPill
                  compact
                  label={approvalStatusLabel(item.status)}
                  tone={approvalStatusTone(item.status)}
                />
              </li>
            ))
          ) : (
            <li className="text-base text-text-secondary">No leave history yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
