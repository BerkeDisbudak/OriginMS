import { describe, expect, it } from "vitest";
import type { LeaveRequestResponse } from "@/api/generated/types.gen";
import {
  approvalStatusLabel,
  approvalStatusTone,
  formatRequestAge,
  leaveTypeLabel,
  matchesApprovalSearch,
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

  it("formats row age and search matches requester fields", () => {
    expect(formatRequestAge(request.created_at, new Date("2026-07-01T10:00:00Z"))).toBe("2h");
    expect(matchesApprovalSearch(request, "Mert Kaya", "mert")).toBe(true);
    expect(matchesApprovalSearch(request, "Mert Kaya", "annual")).toBe(true);
    expect(matchesApprovalSearch(request, "Mert Kaya", "finance")).toBe(false);
  });
});
