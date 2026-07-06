"use client";

import { QueryClientProvider, useQueries, useQuery } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import {
  getCurrentUserOptions,
  getEmployeeOptions,
  listEmployeesOptions,
  listLeaveRequestsOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import type { EmployeeResponse } from "@/api/generated/types.gen";
import {
  createFeatureQueryClient,
  ensureGeneratedClientConfigured,
  resolveDemoEmail,
  useDemoSession,
} from "@/api/session";

const staleTime = 30_000;

export function useDashboardCurrentUser(enabled: boolean) {
  return useQuery({
    ...getCurrentUserOptions(),
    enabled,
  });
}

export function DashboardApiProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createFeatureQueryClient());

  ensureGeneratedClientConfigured();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function useDashboardSession(demoUser: string | null) {
  return useDemoSession(resolveDemoEmail(demoUser, "executive"));
}

export function useDashboardEmployees(enabled: boolean) {
  return useQuery({
    ...listEmployeesOptions({ query: { limit: 100 } }),
    enabled,
  });
}

export function useDashboardPendingApprovals(enabled: boolean) {
  return useQuery({
    ...listLeaveRequestsOptions({ query: { limit: 100, status: "pending" } }),
    enabled,
  });
}

export function useDashboardApprovedLeave(enabled: boolean) {
  return useQuery({
    ...listLeaveRequestsOptions({ query: { limit: 100, status: "approved" } }),
    enabled,
  });
}

export function useDashboardEmployeeLookup(employeeIds: string[], enabled: boolean) {
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
