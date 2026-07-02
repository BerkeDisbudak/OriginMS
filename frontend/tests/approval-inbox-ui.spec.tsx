import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement as h, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LeaveRequestResponse } from "@/api/generated/types.gen";
import { ToastProvider } from "@/ui";

const apiState = vi.hoisted(() => ({
  approve: vi.fn(),
  page: {
    items: [
      {
        business_days: 2,
        created_at: "2026-07-01T08:00:00Z",
        employee_id: "emp_employee",
        end_date: "2026-07-11",
        id: "lvr_pending_01",
        note: "Family appointment",
        start_date: "2026-07-10",
        status: "pending",
        type: "ANNUAL",
      },
    ],
    page: { next_cursor: null },
  } satisfies { items: LeaveRequestResponse[]; page: { next_cursor: string | null } },
  reject: vi.fn(),
  request: {
    business_days: 2,
    created_at: "2026-07-01T08:00:00Z",
    employee_id: "emp_employee",
    end_date: "2026-07-11",
    id: "lvr_pending_01",
    note: "Family appointment",
    start_date: "2026-07-10",
    status: "pending",
    type: "ANNUAL",
  } satisfies LeaveRequestResponse,
  requestsPending: false,
}));

vi.mock("@/api/approval-inbox", () => ({
  ApprovalInboxApiProvider: ({ children }: { children: ReactNode }) => h("div", null, children),
  useApprovalInboxCurrentUser: () => ({
    data: { email: "manager@origin-fgl.local" },
    error: null,
  }),
  useApprovalInboxEmployee: () => ({
    data: {
      first_name: "Elif",
      last_name: "Demir",
      title: "Operations Specialist",
    },
  }),
  useApprovalInboxEmployees: () => ({
    emp_employee: {
      first_name: "Elif",
      last_name: "Demir",
      title: "Operations Specialist",
    },
  }),
  useApprovalInboxLeaveBalance: () => ({
    data: {
      pending_days: 1,
      remaining: 12,
    },
  }),
  useApprovalInboxRequest: () => ({
    data: undefined,
  }),
  useApprovalInboxRequests: () => ({
    data: apiState.page,
    error: null,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isPending: apiState.requestsPending,
  }),
  useApproveLeaveRequest: () => ({
    mutateAsync: apiState.approve,
  }),
  useDemoManagerSession: () => ({
    error: null,
    isPending: false,
    tokenReady: true,
  }),
  useRejectLeaveRequest: () => ({
    mutateAsync: apiState.reject,
  }),
}));

async function renderInbox() {
  const { ApprovalInboxPage } = await import("@/features/approval-inbox");
  return render(h(ToastProvider, null, h(ApprovalInboxPage)));
}

beforeEach(() => {
  apiState.approve = vi.fn(() => new Promise(() => undefined));
  apiState.reject = vi.fn();
  apiState.requestsPending = false;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("approval inbox screen states", () => {
  it("shows skeleton only after the 200ms gate", async () => {
    vi.useFakeTimers();
    apiState.requestsPending = true;

    await renderInbox();

    expect(screen.queryByRole("status")).toBeNull();
    act(() => vi.advanceTimersByTime(199));
    expect(screen.queryByRole("status")).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("acknowledges approve immediately without removing the row", async () => {
    let resolveApprove: () => void = () => undefined;
    apiState.approve = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveApprove = () => resolve(apiState.request);
        }),
    );
    await renderInbox();

    fireEvent.keyDown(window, { key: "a" });

    expect(screen.getByRole("button", { name: "Approving..." })).toBeTruthy();
    expect(screen.getAllByText("Elif Demir").length).toBeGreaterThan(0);
    resolveApprove();
  });

  it("validates reject reason inline before submit", async () => {
    await renderInbox();

    fireEvent.keyDown(window, { key: "r" });
    fireEvent.blur(screen.getByLabelText("Reject reason"));

    expect(screen.getByRole("alert").textContent).toBe("Reason must be at least 5 characters.");
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Submit rejection" }).disabled,
    ).toBe(true);
  });
});
