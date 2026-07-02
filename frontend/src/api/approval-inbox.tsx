"use client";

import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import {
  approveLeaveRequestMutation as generatedApproveLeaveRequestMutation,
  rejectLeaveRequestMutation as generatedRejectLeaveRequestMutation,
  getCurrentUserOptions,
  getEmployeeOptions,
  getLeaveBalanceOptions,
  getLeaveRequestOptions,
  listLeaveRequestsOptions,
} from "@/api/generated/@tanstack/react-query.gen";
import { client } from "@/api/generated/client.gen";
import { login } from "@/api/generated/sdk.gen";
import type { EmployeeResponse, LeaveStatus, LoginResponse } from "@/api/generated/types.gen";

const demoManagerEmail = "manager@origin-fgl.local";
const demoPassword = "password";
const staleTime = 30_000;

let accessToken: string | undefined;

function configureGeneratedClient() {
  client.setConfig({
    baseUrl: "",
    auth: () => accessToken,
  });
}

function setAccessToken(token: string) {
  accessToken = token;
  configureGeneratedClient();
}

export function ApprovalInboxApiProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: false,
            staleTime,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  configureGeneratedClient();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function useDemoManagerSession() {
  const [tokenReady, setTokenReady] = useState(Boolean(accessToken));

  const session = useQuery({
    queryKey: ["approval-inbox", "demo-manager-session"],
    queryFn: async () => {
      const { data } = await login({
        body: {
          email: demoManagerEmail,
          password: demoPassword,
        },
        throwOnError: true,
      });
      return data;
    },
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    const data = session.data as LoginResponse | undefined;
    if (data?.access_token) {
      setAccessToken(data.access_token);
      setTokenReady(true);
    }
  }, [session.data]);

  return {
    ...session,
    tokenReady,
  };
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
