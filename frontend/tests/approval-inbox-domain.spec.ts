import { describe, expect, it } from "vitest";
import type { LeaveRequestResponse, ProblemDetail } from "@/api/generated/types.gen";
import {
  approvalStatusLabel,
  approvalStatusTone,
  formatRequestAge,
  leaveTypeLabel,
  matchesApprovalSearch,
  moveSelection,
  problemDetail,
  problemFieldMessage,
} from "@/domain/approval-inbox";

const request: LeaveRequestResponse = {
  business_days: 2,
  created_at: "2026-07-01T08:00:00Z",
  employee_id: "emp_manager",
  end_date: "2026-07-11",
  id: "lvr_1",
  start_date: "2026-07-10",
  status: "pending",
  type: "ANNUAL",
};

describe("approval inbox domain helpers", () => {
  it("maps statuses and leave types to display values", () => {
    expect(approvalStatusTone("pending")).toBe("warning");
    expect(approvalStatusTone("approved")).toBe("success");
    expect(approvalStatusLabel("rejected")).toBe("Rejected");
    expect(leaveTypeLabel("BEREAVEMENT")).toBe("Bereavement");
  });

  it("moves selection through the visible list", () => {
    expect(moveSelection(0, 1, 3)).toBe(1);
    expect(moveSelection(2, 1, 3)).toBe(0);
    expect(moveSelection(0, -1, 3)).toBe(2);
    expect(moveSelection(0, 1, 0)).toBe(-1);
  });

  it("formats row age and search matches requester fields", () => {
    expect(formatRequestAge(request.created_at, new Date("2026-07-01T10:00:00Z"))).toBe("2h");
    expect(matchesApprovalSearch(request, "Mert Kaya", "mert")).toBe(true);
    expect(matchesApprovalSearch(request, "Mert Kaya", "annual")).toBe(true);
    expect(matchesApprovalSearch(request, "Mert Kaya", "finance")).toBe(false);
  });

  it("extracts problem detail and field messages", () => {
    const problem: ProblemDetail = {
      detail: "Validation failed.",
      errors: [{ code: "too_short", field: "reason", message: "Reason is too short." }],
      status: 422,
      title: "Validation failed",
    };

    expect(problemDetail(problem)).toBe("Validation failed.");
    expect(problemFieldMessage(problem, "reason")).toBe("Reason is too short.");
    expect(problemDetail("network")).toBe("The request could not be completed.");
  });
});
