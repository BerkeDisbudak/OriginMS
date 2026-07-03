"use client";

import { QueryClient, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { client } from "@/api/generated/client.gen";
import { login } from "@/api/generated/sdk.gen";
import type { LoginResponse } from "@/api/generated/types.gen";

const demoManagerEmail = "manager@origin-fgl.local";
const demoPassword = "password";
export const staleTime = 30_000;

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

export function createFeatureQueryClient() {
  return new QueryClient({
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
  });
}

export function ensureGeneratedClientConfigured() {
  configureGeneratedClient();
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
