"use client";

import {
  QueryClientProvider,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import {
  approveLeaveRequestMutation as generatedApproveLeaveRequestMutation,
  rejectLeaveRequestMutation as generatedRejectLeaveRequestMutation,
  getCurrentUserOptions,
  getEmployeeOptions,
  getLeaveBalanceOptions,
  getLeaveRequestOptions,
  listLeaveRequestsOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import type { EmployeeResponse, LeaveStatus } from "@/api/generated/types.gen";
import { createFeatureQueryClient, ensureGeneratedClientConfigured } from "@/api/session";

export { useDemoManagerSession } from "@/api/session";

const staleTime = 30_000;

export function ApprovalInboxApiProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createFeatureQueryClient());

  ensureGeneratedClientConfigured();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function useApprovalInboxCurrentUser(enabled: boolean) {
  return useQuery({
    ...getCurrentUserOptions(),
    enabled,
  });
}

export function useApprovalInboxRequests(
  enabled: boolean,
  status: LeaveStatus = "pending",
  cursor?: string | null,
) {
  return useQuery({
    ...listLeaveRequestsOptions({
      query: {
        cursor: cursor ?? undefined,
        limit: 12,
        status,
      },
    }),
    enabled,
  });
}

export function useApprovalInboxRequest(leaveRequestId: string | undefined, enabled: boolean) {
  return useQuery({
    ...getLeaveRequestOptions({
      path: {
        leave_request_id: leaveRequestId ?? "",
      },
    }),
    enabled: enabled && Boolean(leaveRequestId),
  });
}

export function useApprovalInboxEmployee(employeeId: string | undefined, enabled: boolean) {
  return useQuery({
    ...getEmployeeOptions({
      path: {
        employee_id: employeeId ?? "",
      },
    }),
    enabled: enabled && Boolean(employeeId),
  });
}

export function useApprovalInboxEmployees(employeeIds: string[], enabled: boolean) {
  const uniqueIds = [...new Set(employeeIds)].filter(Boolean);
  const queries = useQueries({
    queries: uniqueIds.map((employeeId) => ({
      ...getEmployeeOptions({
        path: {
          employee_id: employeeId,
        },
      }),
      enabled,
      staleTime,
    })),
  });

  return uniqueIds.reduce<Record<string, EmployeeResponse | undefined>>(
    (lookup, employeeId, index) => {
      lookup[employeeId] = queries[index]?.data;
      return lookup;
    },
    {},
  );
}

export function useApprovalInboxLeaveBalance(employeeId: string | undefined, enabled: boolean) {
  return useQuery({
    ...getLeaveBalanceOptions({
      path: {
        employee_id: employeeId ?? "",
      },
    }),
    enabled: enabled && Boolean(employeeId),
  });
}

export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    ...generatedApproveLeaveRequestMutation(),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
    },
  });
}

export function useRejectLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    ...generatedRejectLeaveRequestMutation(),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
    },
  });
}
