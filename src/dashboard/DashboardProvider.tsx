import React, { createContext, useContext, useMemo } from "react";
import { createSimetrixClient, type SimetrixClient } from "@/api/simetrixClient";
import { useSimRunner, type UseSimRunnerReturn } from "@/hooks/useSimRunner";

type DashboardContextValue = {
  sim: UseSimRunnerReturn;
  api: (path: string) => string;
  getAuthHeaders: () => Record<string, string>;
  client: SimetrixClient;
};

type DashboardProviderProps = {
  api: (path: string) => string;
  getAuthHeaders: () => Record<string, string>;
  children: React.ReactNode;
};

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export function DashboardProvider({ api, getAuthHeaders, children }: DashboardProviderProps) {
  const client = useMemo(
    () =>
      createSimetrixClient({
        resolvePath: api,
        getHeaders: getAuthHeaders,
      }),
    [api, getAuthHeaders]
  );

  const sim = useSimRunner({ client });

  const value = useMemo<DashboardContextValue>(
    () => ({
      sim,
      api,
      getAuthHeaders,
      client,
    }),
    [sim, api, getAuthHeaders, client]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within a DashboardProvider.");
  }
  return ctx;
}

export function useSimetrixClient() {
  return useDashboard().client;
}
