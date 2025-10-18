import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  Download,
  RefreshCcw,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { resolveApiBase, resolveApiKey } from "@/utils/apiConfig";

type StatusState = "checking" | "ok" | "warn" | "error";

type StatusResult = {
  id: string;
  label: string;
  status: StatusState;
  detail?: string;
  optional?: boolean;
};

type StatusDefinition = {
  id: string;
  label: string;
  optional?: boolean;
  check: (helpers: StatusHelpers) => Promise<Pick<StatusResult, "status" | "detail">>;
};

type StatusHelpers = {
  apiBase: string;
  api: (path: string) => string;
  headers: Record<string, string>;
  polygonKey: string;
  ptKey: string;
  onUnauthorized: () => void;
};

type ReportDefinition = {
  id: string;
  label: string;
  description: string;
  endpoint: string;
  method?: "GET" | "POST";
  filename: string;
  payload?: Record<string, unknown>;
};

const statusDefinitions: StatusDefinition[] = [
  {
    id: "api-base",
    label: "API base URL",
    check: async ({ apiBase }) => {
      if (!apiBase || apiBase === "https://api.simetrix.io") {
        return { status: apiBase ? "ok" : "error", detail: apiBase || "Not configured" };
      }
      return { status: "ok", detail: apiBase };
    },
  },
  {
    id: "pt-key",
    label: "PT API key",
    check: async ({ ptKey }) => {
      const normalized = (ptKey ?? "").trim();
      return normalized.length
        ? { status: "ok", detail: `${normalized.slice(0, 6)}...` }
        : { status: "warn", detail: "Missing API key (set via Admin portal)." };
    },
  },
  {
    id: "polygon-key",
    label: "Polygon API key",
    optional: true,
    check: async ({ polygonKey }) => {
      const normalized = (polygonKey ?? "").trim();
      return normalized.length
        ? { status: "ok", detail: `${normalized.slice(0, 6)}...` }
        : { status: "warn", detail: "Optional � required for live news search." };
    },
  },
  {
    id: "config-endpoint",
    label: "/config endpoint",
    check: async ({ api, headers, onUnauthorized }) => {
      try {
        const resp = await fetch(api("/config"), {
          headers,
          credentials: "include",
        });
        if (resp.status === 401 || resp.status === 403) {
          onUnauthorized();
          return { status: "error", detail: "Unauthorized" };
        }
        if (!resp.ok) {
          return { status: "error", detail: `HTTP ${resp.status}` };
        }
        return { status: "ok", detail: "Reachable" };
      } catch (error: any) {
        return { status: "error", detail: error?.message || String(error) };
      }
    },
  },
  {
    id: "recent-runs",
    label: "/runs/recent?limit=1",
    check: async ({ api, headers, onUnauthorized }) => {
      try {
        const resp = await fetch(api("/runs/recent?limit=1"), {
          headers,
          credentials: "include",
        });
        if (resp.status === 401 || resp.status === 403) {
          onUnauthorized();
          return { status: "error", detail: "Unauthorized" };
        }
        if (!resp.ok) {
          return { status: "error", detail: `HTTP ${resp.status}` };
        }
        const txt = await resp.text();
        const json = txt ? JSON.parse(txt) : null;
        const count = Array.isArray(json) ? json.length : 0;
        return { status: "ok", detail: `Response OK (${count} items)` };
      } catch (error: any) {
        return { status: "error", detail: error?.message || String(error) };
      }
    },
  },
  {
    id: "session-anon",
    label: "Session bootstrap (/session/anon)",
    optional: true,
    check: async ({ api, headers, onUnauthorized }) => {
      try {
        const resp = await fetch(api("/session/anon"), {
          method: "POST",
          headers,
          credentials: "include",
        });
        if (resp.status === 401 || resp.status === 403) {
          onUnauthorized();
          return { status: "warn", detail: "Unauthorized" };
        }
        if (!resp.ok) {
          return { status: "warn", detail: `HTTP ${resp.status}` };
        }
        return { status: "ok", detail: "Session established" };
      } catch (error: any) {
        return { status: "warn", detail: error?.message || String(error) };
      }
    },
  },
];

const reportDefinitions: ReportDefinition[] = [
  {
    id: "system-health",
    label: "Platform Health JSON",
    description: "Uptime, service dependency checks, and error tallies.",
    endpoint: "/admin/reports/system-health",
    filename: "system-health.json",
  },
  {
    id: "simulation-metrics",
    label: "Simulation Metrics",
    description: "Aggregated SQE run statistics and artifact metadata.",
    endpoint: "/admin/reports/simulations",
    filename: "simetrix-sqe-metrics.json",
  },
  {
    id: "model-training",
    label: "Model Training Runs",
    description: "Model refresh history, feature importances, and training logs.",
    endpoint: "/admin/reports/model-training",
    filename: "model-training-report.json",
  },
  {
    id: "usage-quotas",
    label: "Usage & Quotas",
    description: "Per-account usage, rate limits, and daily quotas.",
    endpoint: "/admin/reports/usage",
    filename: "usage-quotas.json",
  },
  {
    id: "telemetry-events",
    label: "Telemetry Events CSV",
    description: "Recent telemetry events for debugging and auditing.",
    endpoint: "/admin/reports/telemetry",
    filename: "telemetry-events.csv",
  },
];

const STATUS_ICON: Record<StatusState, JSX.Element> = {
  checking: <Loader2 className="h-4 w-4 animate-spin text-white/60" />,
  ok: <CheckCircle className="h-4 w-4 text-emerald-400" />,
  warn: <AlertTriangle className="h-4 w-4 text-amber-400" />,
  error: <XCircle className="h-4 w-4 text-rose-400" />,
};

export default function AdminDashboard() {
  const apiBase = useMemo(() => resolveApiBase(), []);
  const [ptKey, setPtKey] = useState(() => resolveApiKey() ?? "");
  const [polygonKey, setPolygonKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return (
      window.localStorage?.getItem("polygon_api_key") ||
      (window as any).__APP_ENV__?.VITE_POLYGON_API_KEY ||
      ""
    );
  });

  const api = useMemo(
    () => (path: string) => `${apiBase}${path.startsWith("/") ? "" : "/"}${path}`,
    [apiBase]
  );

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authForm, setAuthForm] = useState({ username: "", password: "" });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [ptEditorOpen, setPtEditorOpen] = useState(false);
  const [polygonEditorOpen, setPolygonEditorOpen] = useState(false);
  const [ptKeyDraft, setPtKeyDraft] = useState(ptKey ?? "");
  const [polygonKeyDraft, setPolygonKeyDraft] = useState(polygonKey ?? "");

  const handleUnauthorized = useCallback(() => {
    setIsAuthenticated(false);
    setAuthError("Session expired or unauthorized. Please sign in.");
  }, []);

  const handleAuthInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target;
      setAuthForm((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleLogin = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setAuthLoading(true);
      setAuthError(null);
      try {
        const resp = await fetch(api("/admin/login"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            username: authForm.username,
            password: authForm.password,
          }),
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || `HTTP ${resp.status}`);
        }
        setIsAuthenticated(true);
        setAuthForm({ username: "", password: "" });
        toast.success("Signed in to admin dashboard.");
      } catch (error: any) {
        const message = error?.message || String(error);
        setAuthError(message);
        setIsAuthenticated(false);
        toast.error(message);
      } finally {
        setAuthLoading(false);
      }
    },
    [api, authForm.username, authForm.password]
  );

  const togglePtEditor = useCallback(() => {
    setPtEditorOpen((prev) => {
      const next = !prev;
      if (!prev) setPtKeyDraft(ptKey ?? "");
      return next;
    });
  }, [ptKey]);

  const togglePolygonEditor = useCallback(() => {
    setPolygonEditorOpen((prev) => {
      const next = !prev;
      if (!prev) setPolygonKeyDraft(polygonKey ?? "");
      return next;
    });
  }, [polygonKey]);

  const handleCancelPtKey = useCallback(() => {
    setPtEditorOpen(false);
    setPtKeyDraft(ptKey ?? "");
  }, [ptKey]);

  const handleCancelPolygonKey = useCallback(() => {
    setPolygonEditorOpen(false);
    setPolygonKeyDraft(polygonKey ?? "");
  }, [polygonKey]);

  const handleSavePtKey = useCallback(() => {
    const trimmed = ptKeyDraft.trim();
    try {
      if (typeof window !== "undefined") {
        if (trimmed) {
          window.localStorage?.setItem("pt_api_key", trimmed);
        } else {
          window.localStorage?.removeItem("pt_api_key");
        }
        window.localStorage?.removeItem("smx_api_key");
      }
      setPtKey(trimmed);
      toast.success(trimmed ? "PT API key saved." : "PT API key cleared.");
      setPtEditorOpen(false);
    } catch (error: any) {
      toast.error(error?.message || String(error));
    }
  }, [ptKeyDraft]);

  const handleSavePolygonKey = useCallback(() => {
    const trimmed = polygonKeyDraft.trim();
    try {
      if (typeof window !== "undefined") {
        if (trimmed) {
          window.localStorage?.setItem("polygon_api_key", trimmed);
        } else {
          window.localStorage?.removeItem("polygon_api_key");
        }
      }
      setPolygonKey(trimmed);
      toast.success(trimmed ? "Polygon API key saved." : "Polygon API key cleared.");
      setPolygonEditorOpen(false);
    } catch (error: any) {
      toast.error(error?.message || String(error));
    }
  }, [polygonKeyDraft]);

  useEffect(() => {
    if (!ptEditorOpen) {
      setPtKeyDraft(ptKey ?? "");
    }
  }, [ptKey, ptEditorOpen]);

  useEffect(() => {
    if (!polygonEditorOpen) {
      setPolygonKeyDraft(polygonKey ?? "");
    }
  }, [polygonKey, polygonEditorOpen]);

  const headers = useMemo(() => {
    const baseHeaders: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (ptKey && ptKey.trim()) {
      baseHeaders["X-API-Key"] = ptKey.trim();
    }
    return baseHeaders;
  }, [ptKey]);

  const [statuses, setStatuses] = useState<StatusResult[]>(
    statusDefinitions.map(({ id, label, optional }) => ({
      id,
      label,
      status: "checking",
      optional,
    }))
  );

  const [downloading, setDownloading] = useState<string | null>(null);

  const refreshStatuses = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    const helpers: StatusHelpers = {
      apiBase,
      api,
      headers,
      polygonKey,
      ptKey,
      onUnauthorized: handleUnauthorized,
    };
    setStatuses((prev) =>
      prev.map((item) => ({
        ...item,
        status: "checking",
      }))
    );
    const results: StatusResult[] = [];
    for (const definition of statusDefinitions) {
      const baseResult: StatusResult = {
        id: definition.id,
        label: definition.label,
        status: "checking",
        optional: definition.optional,
      };
      if (!apiBase && definition.id !== "api-base") {
        results.push({
          ...baseResult,
          status: "error",
          detail: "Missing API base",
        });
        continue;
      }
      try {
        const outcome = await definition.check(helpers);
        results.push({
          ...baseResult,
          status: outcome.status,
          detail: outcome.detail,
        });
      } catch (error: any) {
        results.push({
          ...baseResult,
          status: "error",
          detail: error?.message || String(error),
        });
      }
    }
    setStatuses(results);
  }, [apiBase, api, headers, polygonKey, ptKey, handleUnauthorized, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshStatuses();
    }
  }, [refreshStatuses, isAuthenticated, ptKey, polygonKey]);

  const downloadReport = async (report: ReportDefinition) => {
    if (!apiBase) {
      toast.error("Configure your API base before downloading reports.");
      return;
    }
    setDownloading(report.id);
    try {
      const resp = await fetch(api(report.endpoint), {
        method: report.method ?? "GET",
        headers,
        credentials: "include",
        body: report.method === "POST" ? JSON.stringify(report.payload ?? {}) : undefined,
      });
      if (resp.status === 401 || resp.status === 403) {
        handleUnauthorized();
        throw new Error("Unauthorized");
      }
      const blob = await resp.blob();
      if (!resp.ok) {
        const text = await blob.text();
        throw new Error(text || `HTTP ${resp.status}`);
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = report.filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${report.filename}`);
    } catch (error: any) {
      toast.error(error?.message || String(error));
    } finally {
      setDownloading(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-black text-white">
        <Toaster position="bottom-right" />
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6 md:px-8">
          <Card className="w-full max-w-md border-white/10 bg-white/5">
            <CardHeader className="pb-2">
              <h1 className="text-lg font-semibold">Admin Login</h1>
              <p className="text-sm text-white/60">Enter admin credentials to manage reports and system status.</p>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <label htmlFor="admin-username" className="block text-xs font-medium text-white/60">
                    Username
                  </label>
                  <input
                    id="admin-username"
                    name="username"
                    type="text"
                    value={authForm.username}
                    onChange={handleAuthInputChange}
                    autoComplete="username"
                    className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    placeholder="admin"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="admin-password" className="block text-xs font-medium text-white/60">
                    Password
                  </label>
                  <input
                    id="admin-password"
                    name="password"
                    type="password"
                    value={authForm.password}
                    onChange={handleAuthInputChange}
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    placeholder="••••••••"
                  />
                </div>
                {authError ? (
                  <div className="text-xs text-rose-400">{authError}</div>
                ) : null}
                <button
                  type="submit"
                  disabled={authLoading || !authForm.username || !authForm.password}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500/80 px-3 py-2 text-sm font-medium text-black transition hover:bg-emerald-400 disabled:opacity-60"
                >
                  {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {authLoading ? "Signing in" : "Sign in"}
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const ptKeyNormalized = ptKey ?? "";
  const polygonKeyNormalized = polygonKey ?? "";
  const ptKeyDirty = ptKeyDraft.trim() !== ptKeyNormalized.trim();
  const polygonKeyDirty = polygonKeyDraft.trim() !== polygonKeyNormalized.trim();

  return (
    <main className="min-h-screen bg-black text-white">
      <Toaster position="bottom-right" />
      <div className="border-b border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6 md:px-8">
          <h1 className="text-lg font-semibold tracking-wide">Admin Dashboard</h1>
          <button
            onClick={refreshStatuses}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/80 transition hover:bg-white/10"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10 md:px-8 md:py-14 space-y-10">
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">System Status</h2>
            <p className="text-sm text-white/60">
              Quick health overview of required services. Optional checks show warnings when configuration is missing.
            </p>
          </div>
          <Card>
            <CardContent className="grid gap-4 p-4 md:p-6">
              {statuses.map((status) => {
                const isPtKey = status.id === "pt-key";
                const isPolygonKey = status.id === "polygon-key";
                const isEditorOpen = isPtKey ? ptEditorOpen : isPolygonKey ? polygonEditorOpen : false;
                const statusMessage =
                  status.status === "checking"
                    ? "Checking..."
                    : status.status === "ok"
                    ? "Healthy"
                    : status.status === "warn"
                    ? "Action recommended"
                    : "Attention required";
                const detailText = status.detail && status.detail.trim().length ? status.detail : "-";
                return (
                  <div key={status.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span>{STATUS_ICON[status.status]}</span>
                        <div>
                          <div className="text-sm font-medium">
                            {status.label}
                            {status.optional ? (
                              <span className="ml-2 text-xs uppercase tracking-wide text-white/40">Optional</span>
                            ) : null}
                          </div>
                          <div className="text-xs text-white/60">{detailText}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40">{statusMessage}</span>
                        {(isPtKey || isPolygonKey) && (
                          <button
                            onClick={isPtKey ? togglePtEditor : togglePolygonEditor}
                            className="rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-xs text-white/70 transition hover:bg-white/10"
                          >
                            {isEditorOpen ? "Close" : "Edit"}
                          </button>
                        )}
                      </div>
                    </div>
                    {isPtKey && ptEditorOpen && (
                      <div className="mt-4 space-y-3 rounded-lg border border-white/10 bg-black/50 p-4">
                        <label className="block text-xs font-medium text-white/60" htmlFor="admin-sim-key">
                          PT API key
                        </label>
                        <input
                          id="admin-sim-key"
                          value={ptKeyDraft}
                          onChange={(event) => setPtKeyDraft(event.target.value)}
                          className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          placeholder="PT_API_KEY"
                          autoComplete="off"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSavePtKey}
                            disabled={!ptKeyDirty}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/80 px-3 py-1.5 text-sm text-black transition hover:bg-emerald-400 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelPtKey}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-transparent px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/10"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {isPolygonKey && polygonEditorOpen && (
                      <div className="mt-4 space-y-3 rounded-lg border border-white/10 bg-black/50 p-4">
                        <label className="block text-xs font-medium text-white/60" htmlFor="admin-polygon-key">
                          Polygon API key
                        </label>
                        <input
                          id="admin-polygon-key"
                          value={polygonKeyDraft}
                          onChange={(event) => setPolygonKeyDraft(event.target.value)}
                          className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          placeholder="POLYGON_API_KEY"
                          autoComplete="off"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSavePolygonKey}
                            disabled={!polygonKeyDirty}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/80 px-3 py-1.5 text-sm text-black transition hover:bg-emerald-400 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelPolygonKey}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-transparent px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/10"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Download Reports</h2>
            <p className="text-sm text-white/60">
              Export JSON or CSV snapshots for auditing, investigations, or offline analysis. Requires appropriate API
              permissions.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {reportDefinitions.map((report) => (
              <Card key={report.id} className="border-white/10 bg-white/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{report.label}</div>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-white/50">
                      {report.filename.split(".").pop()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="text-sm text-white/60">{report.description}</p>
                  <button
                    onClick={() => downloadReport(report)}
                    disabled={downloading === report.id}
                    className="inline-flex items-center gap-2 self-start rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-60"
                  >
                    {downloading === report.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {downloading === report.id ? "Preparing�" : "Download"}
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Next Steps</h2>
            <p className="text-sm text-white/60">
              Want richer admin views? Libraries like <code>tanstack/react-table</code> or <code>recharts</code> can
              render interactive tables and charts once the report payloads are shaped for them.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}



























