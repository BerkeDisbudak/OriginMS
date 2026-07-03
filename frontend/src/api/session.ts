"use client";

import { QueryClient, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { client } from "@/api/generated/client.gen";
import { login } from "@/api/generated/sdk.gen";
import type { LoginResponse } from "@/api/generated/types.gen";

const demoManagerEmail = "manager@origin-fgl.local";
const demoPassword = "password";
export const staleTime = 30_000;

export const demoEmailsByAlias: Record<string, string> = {
  employee: "employee@origin-fgl.local",
  executive: "executive@origin-fgl.local",
  hr: "hr@origin-fgl.local",
  manager: demoManagerEmail,
};

export function resolveDemoEmail(alias: string | null, fallbackAlias: string): string {
  const aliasEmail = alias ? demoEmailsByAlias[alias] : undefined;
  if (aliasEmail) {
    return aliasEmail;
  }
  const fallbackEmail = demoEmailsByAlias[fallbackAlias];
  if (!fallbackEmail) {
    throw new Error(`Unknown demo alias: ${fallbackAlias}`);
  }
  return fallbackEmail;
}

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

export function useDemoSession(email: string) {
  const [tokenReady, setTokenReady] = useState(Boolean(accessToken));

  const session = useQuery({
    queryKey: ["demo-session", email],
    queryFn: async () => {
      const { data } = await login({
        body: {
          email,
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

export function useDemoManagerSession() {
  return useDemoSession(demoManagerEmail);
}
