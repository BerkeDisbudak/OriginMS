"use client";

import { QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import {
  updateEmployeeMutation as generatedUpdateEmployeeMutation,
  getCurrentUserOptions,
  getEmployeeOptions,
  getLeaveBalanceOptions,
  listEmployeeLeaveHistoryOptions,
  listEmployeesOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import type { EmployeeUpdate, LeaveStatus } from "@/api/generated/types.gen";
import {
  createFeatureQueryClient,
  ensureGeneratedClientConfigured,
  resolveDemoEmail,
  useDemoSession,
} from "@/api/session";

export function EmployeesApiProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createFeatureQueryClient());

  ensureGeneratedClientConfigured();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function useEmployeesDemoSession(demoUserAlias: string | null) {
  return useDemoSession(resolveDemoEmail(demoUserAlias, "hr"));
}

export function useEmployeesCurrentUser(enabled: boolean) {
  return useQuery({
    ...getCurrentUserOptions(),
    enabled,
  });
}

export function useEmployeesList(enabled: boolean, cursor?: string | null) {
  return useQuery({
    ...listEmployeesOptions({
      query: {
        cursor: cursor ?? undefined,
        limit: 25,
      },
    }),
    enabled,
  });
}

export function useEmployeeProfile(employeeId: string | undefined, enabled: boolean) {
  return useQuery({
    ...getEmployeeOptions({
      path: {
        employee_id: employeeId ?? "",
      },
    }),
    enabled: enabled && Boolean(employeeId),
  });
}

export function useEmployeeLeaveBalance(employeeId: string | undefined, enabled: boolean) {
  return useQuery({
    ...getLeaveBalanceOptions({
      path: {
        employee_id: employeeId ?? "",
      },
    }),
    enabled: enabled && Boolean(employeeId),
  });
}

export function useEmployeeLeaveHistory(
  employeeId: string | undefined,
  enabled: boolean,
  status?: LeaveStatus,
  cursor?: string | null,
) {
  return useQuery({
    ...listEmployeeLeaveHistoryOptions({
      path: {
        employee_id: employeeId ?? "",
      },
      query: {
        cursor: cursor ?? undefined,
        limit: 5,
        status: status ?? undefined,
      },
    }),
    enabled: enabled && Boolean(employeeId),
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    ...generatedUpdateEmployeeMutation(),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
    },
  });
}

export type { EmployeeUpdate };
