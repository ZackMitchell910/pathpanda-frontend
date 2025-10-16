import React, { createContext, useContext, useMemo } from "react";
import { useSimRunner, type UseSimRunnerReturn } from "@/hooks/useSimRunner";

type DashboardContextValue = {
  sim: UseSimRunnerReturn;
  api: (path: string) => string;
  getAuthHeaders: () => Record<string, string>;
};

type DashboardProviderProps = {
  api: (path: string) => string;
  getAuthHeaders: () => Record<string, string>;
  children: React.ReactNode;
};

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export function DashboardProvider({ api, getAuthHeaders, children }: DashboardProviderProps) {
  const sim = useSimRunner({ api, getAuthHeaders });
  const value = useMemo<DashboardContextValue>(
    () => ({ sim, api, getAuthHeaders }),
    [sim, api, getAuthHeaders]
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
