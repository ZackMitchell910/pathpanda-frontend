import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from "react";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import html2canvas from "html2canvas";
import "chart.js/auto";
import { fetchEventSource } from "@microsoft/fetch-event-source";

import { throttle } from "./utils/throttle";
import { encodeState } from "./utils/stateShare";

import { Card } from "./components/ui/Card";
import { NewsList } from "./components/NewsList";
import useNews from "@/hooks/useNews";
import { InlineLegend } from "./components/InlineLegend";
import { ChartActions } from "./components/ChartActions";
import { SummaryCard } from "./components/SummaryCard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ChallengePanel } from "./components/ChallengePanel";
import RightRail from "./components/RightRail";
import { TrackRecordPanel } from "./components/TrackRecordPanel";
import { EmptyState } from "@/components/EmptyState";
import { CardMenu } from "@/components/ui/CardMenu";
import LogoTwinCore from "@/components/branding/LogoTwinCore";
import LoadingButton from "./components/ui/LoadingButton";
import RecentRunsRail from "./components/RecentRunsRail";

// Lazy chunked charts/add-ons
const FanChart = React.lazy(() => import("./components/FanChart"));
const HitProbabilityRibbon = React.lazy(() =>
  import("./components/PredictiveAddOns").then((m) => ({ default: m.HitProbabilityRibbon }))
);
const TerminalDistribution = React.lazy(() =>
  import("./components/PredictiveAddOns").then((m) => ({ default: m.TerminalDistribution }))
);
const ScenarioTiles = React.lazy(() =>
  import("./components/PredictiveAddOns").then((m) => ({ default: m.ScenarioTiles }))
);
const DriversWaterfall = React.lazy(() =>
  import("./components/PredictiveAddOns").then((m) => ({ default: m.DriversWaterfall }))
);
const TargetLadder = React.lazy(() =>
  import("./components/PredictiveAddOns").then((m) => ({ default: m.TargetLadder }))
);

const ChartFallback: React.FC = () => <div className="text-xs text-gray-400">Loading chart…</div>;
const isNum = (x: any): x is number => typeof x === "number" && Number.isFinite(x);
const f2 = (n: any) => Number(n).toFixed(2); // safe toFixed helper

// ---- Types ----
interface MCArtifact {
  symbol: string;
  horizon_days: number;
  median_path: [number, number][];
  bands: {
    p50: [number, number][];
    p80_low: [number, number][];
    p80_high: [number, number][];
    p95_low: [number, number][];
    p95_high: [number, number][];
  };
  prob_up_end: number;
  drivers: { feature: string; weight: number }[];
  terminal_prices?: number[];
  var_es?: { var95: number; es95: number };
  hit_probs?: { thresholds_abs: number[]; probs_by_day: number[][] };
  eod_estimate?: {
    day_index: number;
    median: number;
    mean: number;
    p05: number;
    p95: number;
  };
}

interface RunSummary {
  id: string;
  symbol: string;
  horizon: number;
  n_paths: number;
  finishedAt: string;
  q50?: number | null;
  probUp?: number | null;
}

// ---- Default key (dev + Netlify) ----
const DEFAULT_PT_KEY =
  (import.meta as any)?.env?.VITE_PT_API_KEY ||
  (typeof process !== "undefined" ? (process as any)?.env?.NEXT_PUBLIC_PT_API_KEY : "") ||
  "";

// ---- API base + helpers (Vite/Netlify + safe in browser) ----
const RAW_API_BASE =
  (typeof window !== "undefined" && (window as any).__PP_API_BASE__) ||
  (import.meta as any)?.env?.VITE_PREDICTIVE_API ||
  (import.meta as any)?.env?.VITE_API_BASE ||
  (typeof process !== "undefined" && (process as any)?.env?.NEXT_PUBLIC_BACKEND_URL) ||
  "https://pathpanda-api.onrender.com";

const API_BASE = String(RAW_API_BASE).replace(/\/+$/, "");
const api = (p: string) => `${API_BASE}${p.startsWith("/") ? "" : "/"}${p}`;

// Put key in URL too (helps when proxies/SSE drop headers)
const withApiKey = (url: string, key: string) =>
  (key && key.trim())
    ? `${url}${url.includes("?") ? "&" : "?"}api_key=${encodeURIComponent(key.trim())}`
    : url;

const apiHeaders = (key: string) => ({
  Accept: "application/json",
  "Content-Type": "application/json",
  "X-API-Key": (key || "").trim(),
});

// Text-first helpers so we can detect HTML (Netlify/Vite 404) and show useful errors
async function safeText(r: Response) {
  try { return await r.text(); } catch { return "<no body>"; }
}
function looksLikeHTML(s: string) {
  return /^\s*<!doctype html>|<html/i.test(s);
}

export default function App() {
  // —— UI state ——
  const getInitialTheme = (): "dark" | "light" => {
    const savedTheme = typeof window !== "undefined" ? localStorage.getItem("theme") || "dark" : "dark";
    return savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark";
  };
  const LOG_HEIGHT = "h-40";

  const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme);
  const [symbol, setSymbol] = useState("NVDA");
  const [horizon, setHorizon] = useState<number | "">("");
  const [paths, setPaths] = useState(2000);

  const [includeOptions, setIncludeOptions] = useState(true);
  const [includeFutures, setIncludeFutures] = useState(true);
  const [includeNews, setIncludeNews] = useState(false);
  const [xHandles, setXHandles] = useState("");

  // ✅ apiKey FIRST — everything that uses it must come after this
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_PT_KEY;
    const stored = (localStorage.getItem("apiKey") || "").trim();
    return stored && !stored.toLowerCase().includes("error") ? stored : (DEFAULT_PT_KEY || "");
  });
  const [showApiKey, setShowApiKey] = useState(false);

  const [isTraining, setIsTraining] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const [runId, setRunId] = useState("");
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [drivers, setDrivers] = useState<{ feature: string; weight: number }[]>([]);
  const [probUp, setProbUp] = useState(0);
  const [art, setArt] = useState<MCArtifact | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(
    typeof window !== "undefined" ? !localStorage.getItem("onboardingSeen") : false
  );
  const [activeTab] = useState<"risk" | "scenarios" | "track">("risk");

  const [runHistory, setRunHistory] = useState<RunSummary[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("pp_runs");
      return saved ? (JSON.parse(saved) as RunSummary[]) : [];
    } catch {
      return [];
    }
  });

  const safeRunHistory = useMemo(
    () =>
      (runHistory || []).map((r) => ({
        ...r,
        q50: isNum(r.q50) ? r.q50 : undefined,
        probUp: isNum(r.probUp) ? r.probUp : undefined,
      })),
    [runHistory]
  );

  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    console.info("[PathPanda] API_BASE =", API_BASE || "(empty; using relative URLs)");
  }, []);

  // —— Derived ——
  const horizonNum = typeof horizon === "number" ? horizon : null;

  const throttledLog = useMemo(
    () =>
      throttle((m: string) => {
        setLogMessages((prev) => {
          if (prev[prev.length - 1] === m) return prev;
          return prev.length >= 50 ? [...prev.slice(1), m] : [...prev, m];
        });
      }, 120),
    []
  );
  const throttledProgress = useMemo(() => throttle((p: number) => setProgress(p), 100), []);

  // Persist theme + apiKey
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
      document.documentElement.className = theme;
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const k = apiKey && !apiKey.toLowerCase().includes("error") ? apiKey.trim() : "";
    if (k) localStorage.setItem("apiKey", k);
    else localStorage.removeItem("apiKey");
  }, [apiKey]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logMessages]);

  useEffect(() => {
    if (!showOnboarding) return;
    const t = setTimeout(() => {
      if (typeof window !== "undefined") localStorage.setItem("onboardingSeen", "true");
      setShowOnboarding(false);
    }, 10000);
    return () => clearTimeout(t);
  }, [showOnboarding]);

  // ✅ Memoized headers function (stable, no render loops)
  const getAuthHeaders = useCallback(() => apiHeaders(apiKey), [apiKey]);

  // ---- News (single source of truth) ----
  const {
    items: newsItemsRaw,
    nextCursor,
    loading: newsLoading,
    error: newsError,
    loadMore,
  } = useNews({
    symbol,
    includeNews,
    limit: 6,
    days: 7,
    retry: 0,
    apiBase: API_BASE,                 // hits Render, not localhost
    getHeaders: () => apiHeaders(apiKey), // sends X-API-Key
    onLog: throttledLog,
  });

  const newsItems = useMemo(
    () => (Array.isArray(newsItemsRaw) ? newsItemsRaw : []),
    [newsItemsRaw]
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
      document.documentElement.className = theme;
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const k = apiKey && !apiKey.toLowerCase().includes("error") ? apiKey.trim() : "";
    if (k) localStorage.setItem("apiKey", k);
    else localStorage.removeItem("apiKey");
  }, [apiKey]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logMessages]);

  useEffect(() => {
    if (!showOnboarding) return;
    const t = setTimeout(() => {
      if (typeof window !== "undefined") localStorage.setItem("onboardingSeen", "true");
      setShowOnboarding(false);
    }, 10000);
    return () => clearTimeout(t);
  }, [showOnboarding]);

  // —— Display helpers ——
  const probMeta = useMemo(() => {
    const v = Math.max(0, Math.min(1, probUp || 0));
    const pct = Math.round(v * 100);
    const color = v > 0.51 ? "text-[#34D399]" : v < 0.49 ? "text-[#F87171]" : "text-[#FBBF24]";
    const label = v > 0.51 ? "Bullish" : v < 0.49 ? "Bearish" : "Neutral";
    return { v, pct, color, label };
  }, [probUp]);

  const fmtPct = (x: number | undefined | null) =>
    (Number.isFinite(x) ? (x as number) : 0).toLocaleString(undefined, {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

  const handlePreset = (preset: { symbol: string; horizon: number; paths: number }) => {
    setSymbol(preset.symbol);
    setHorizon(preset.horizon);
    setPaths(preset.paths);
  };

  const eod = art?.eod_estimate ?? null;

  // —— Actions (with guards) ——
  const handleRunSimulationClick = useCallback(async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    try {
      await runSimulation();
    } finally {
      setIsSimulating(false);
    }
  }, [isSimulating]);

  const handleRunPredictClick = useCallback(async () => {
    if (isPredicting) return;
    setIsPredicting(true);
    try {
      await runPredict();
    } finally {
      setIsPredicting(false);
    }
  }, [isPredicting]);

  const handleTrainModelClick = useCallback(async () => {
    if (isTraining) return;
    setIsTraining(true);
    try {
      await trainModel();
    } finally {
      setIsTraining(false);
    }
  }, [isTraining]);

  // ---------------- Export / Share ----------------
  const exportChart = async (chartId: "fan" | "hit" | "terminal" | "drivers" | "ladder") => {
    try {
      const container = document.querySelector(`[data-chart="${chartId}"]`) as HTMLElement | null;
      if (container) {
        const canvas = container.querySelector("canvas") as HTMLCanvasElement | null;
        const element = canvas ?? container;
        const screenshot = await html2canvas(element, {
          backgroundColor: theme === "dark" ? "#0A111A" : "#F3F4F6",
        });
        const url = screenshot.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = url;
        link.download = `${chartId}.png`;
        link.click();
      }
      if (art && ["fan", "hit", "terminal", "drivers", "ladder"].includes(chartId)) {
        let csvData: string[][] = [];
        switch (chartId) {
          case "fan":
            csvData = [
              ["Day", "Median", "P80 Low", "P80 High", "P95 Low", "P95 High"],
              ...art.median_path.map(([t], i) => [
                `D${t}`,
                f2(art.median_path[i]?.[1]),
                f2(art.bands?.p80_low?.[i]?.[1]),
                f2(art.bands?.p80_high?.[i]?.[1]),
                f2(art.bands?.p95_low?.[i]?.[1]),
                f2(art.bands?.p95_high?.[i]?.[1]),
              ]),
            ];
            break;
          case "hit":
            csvData = [
              ["Day", ...(art.hit_probs?.thresholds_abs?.map((t) => `Above ${f2(t)}`) || [])],
              ...art.median_path.map(([t], i) => [
                `D${t}`,
                ...(art.hit_probs?.probs_by_day?.map((probs) => f2(probs?.[i])) || []),
              ]),
            ];
            break;
          case "terminal":
            csvData = [["Price", "Frequency"], ...((art.terminal_prices || []).map((p) => [f2(p), "1"]) || [])];
            break;
          case "drivers":
            csvData = [["Driver", "Weight"], ...drivers.map((d) => [d.feature, f2(d.weight)])];
            break;
          case "ladder":
            csvData = [["Target", "Probability"], ...buildLadderItems(art).map((d) => [d.label, f2(d.p * 100)])];
            break;
        }
        if (csvData.length) {
          const csv = csvData.map((row) => row.join(",")).join("\n");
          const blob = new Blob([csv], { type: "text/csv" });
          const csvLink = document.createElement("a");
          csvLink.href = URL.createObjectURL(blob);
          csvLink.download = `${chartId}.csv`;
          csvLink.click();
        }
        toast.success(`Exported ${chartId} as PNG and CSV`);
      } else {
        toast.error("No data available for export");
      }
    } catch (e: any) {
      toast.error(`Export failed: ${e.message || e}`);
    }
  };

  const shareChart = (chartId: string) => {
    const state = encodeState({ symbol, horizon, paths, chartId });
    const url = `${window.location.origin}/share?state=${state}`;
    navigator.clipboard.writeText(url);
    toast.success("Shareable link copied!");
  };

  // ---- Backend calls ----
  async function labelNowAction() {
    if (!(apiKey || "").trim()) return toast.error("Enter API key first");
    try {
      const url = withApiKey(api("/outcomes/label"), apiKey);
      const r = await fetch(url, { method: "POST", headers: apiHeaders(apiKey) });
      const text = await safeText(r);
      if (!r.ok) {
        if (looksLikeHTML(text)) throw new Error("Misrouted to HTML (likely Vite/Netlify). Check API base.");
        throw new Error(`HTTP ${r.status} – ${text}`);
      }
      const data = JSON.parse(text);
      toast.success(`Labeled ${data.labeled ?? 0} outcomes`);
    } catch (e: any) {
      toast.error(`Labeling failed: ${e.message || e}`);
    }
  }
  async function learnNowAction() {
    if (!(apiKey || "").trim()) return toast.error("Enter API key first");
    try {
      const url = withApiKey(api("/learn/online"), apiKey);
      const r = await fetch(url, {
        method: "POST",
        headers: apiHeaders(apiKey),
        body: JSON.stringify({ symbol: symbol.toUpperCase(), steps: 50, batch: 32 }),
      });
      const text = await safeText(r);
      if (!r.ok) {
        if (looksLikeHTML(text)) throw new Error("Misrouted to HTML (likely Vite/Netlify). Check API base.");
        throw new Error(`HTTP ${r.status} – ${text}`);
      }
      const data = JSON.parse(text);
      const w0 = Number(data?.model?.coef?.[0]);
      toast.success(`Online learn OK${Number.isFinite(w0) ? ` — w[0]=${w0.toFixed(3)}` : ""}`);
    } catch (e: any) {
      toast.error(`Online learn failed: ${e.message || e}`);
    }
  }

  async function trainModel() {
    if (!(apiKey || "").trim()) {
      throttledLog("Error: Please enter a valid API key");
      return;
    }
    throttledLog("Training model...");
    try {
      const url = withApiKey(api("/train"), apiKey);
      const resp = await fetch(url, {
        method: "POST",
        headers: apiHeaders(apiKey),
        body: JSON.stringify({ symbol: symbol.toUpperCase(), lookback_days: 180 }),
      });
      const text = await safeText(resp);
      if (!resp.ok) {
        if (looksLikeHTML(text)) {
          throw new Error("Misrouted to HTML (likely Vite/Netlify). Check API base.");
        }
        throw new Error(`Train failed: ${resp.status} – ${text}`);
      }
      throttledLog("Model trained successfully.");
    } catch (e: any) {
      throttledLog(`Error: ${e.message || e}`);
    }
  }

  async function runPredict() {
    if (!(apiKey || "").trim()) {
      throttledLog("Error: Please enter a valid API key");
      return;
    }
    throttledLog("Running prediction...");
    try {
      const h = typeof horizon === "number" ? horizon : 30;
      const url = withApiKey(api("/predict"), apiKey);
      const resp = await fetch(url, {
        method: "POST",
        headers: apiHeaders(apiKey),
        body: JSON.stringify({ symbol: symbol.toUpperCase(), horizon_days: h }),
      });
      const text = await safeText(resp);
      if (!resp.ok) {
        if (looksLikeHTML(text)) throw new Error("Misrouted to HTML (likely Vite/Netlify). Check API base.");
        throw new Error(`Predict failed: ${resp.status} – ${text}`);
      }
      const js = JSON.parse(text);
      const pu = Number(js?.prob_up_next);
      throttledLog(`Prediction: Prob Up Next = ${Number.isFinite(pu) ? (pu * 100).toFixed(2) : "?"}%`);
    } catch (e: any) {
      throttledLog(`Error: ${e.message || e}`);
    }
  }
  // Replace your entire runSimulation() with this
  async function runSimulation() {
    if (!(apiKey || "").trim()) {
      throttledLog("Error: Please enter a valid API key");
      return;
    }
    const hNum = typeof horizon === "number" ? horizon : null;
    if (hNum == null) {
      throttledLog("Error: Please enter a horizon (days).");
      return;
    }
    if (hNum > 365) {
      throttledLog("Error: Horizon must be ≤ 365 days.");
      return;
    }

    setIsSimulating(true);
    setLogMessages([]);
    setArt(null);
    setProgress(0);
    setDrivers([]);
    setProbUp(0);
    setCurrentPrice(null);

    try {
      const payload: any = {
        symbol: symbol.toUpperCase(),
        horizon_days: Number(hNum),
        n_paths: Number(paths),
        timespan: "day",
        include_news: !!includeNews,
        include_options: !!includeOptions,
        include_futures: !!includeFutures,
        ...(xHandles.trim() ? { x_handles: xHandles.trim() } : {}),
      };

      // Kick off
      const startUrl = withApiKey(api("/simulate"), apiKey);
      const resp = await fetch(startUrl, {
        method: "POST",
        headers: apiHeaders(apiKey),
        body: JSON.stringify(payload),
      });
      const startTxt = await safeText(resp);
      if (!resp.ok) {
        if (looksLikeHTML(startTxt)) throw new Error("Misrouted to HTML (likely Vite/Netlify). Check API base.");
        throw new Error(`HTTP ${resp.status} – ${startTxt}`);
      }
      const { run_id } = JSON.parse(startTxt);
      setRunId(run_id);
      throttledLog(`Queued run_id: ${run_id}`);

      // Stream progress (SSE)
      const ctrl = new AbortController();
      try {
        const streamUrl = withApiKey(api(`/simulate/${run_id}/stream`), apiKey);
        await fetchEventSource(streamUrl, {
          headers: apiHeaders(apiKey),
          signal: ctrl.signal,
          openWhenHidden: true,
          onopen: async (r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            throttledLog("Connected to stream");
          },
          onmessage: (ev) => {
            try {
              const d = JSON.parse(ev.data);
              if (typeof d.status === "string") {
                const p = typeof d.progress === "number" ? d.progress : 0;
                throttledProgress(p);
                throttledLog(`Status: ${d.status} | Progress: ${Math.round(p)}%`);
              }
            } catch {
              // ignore transient parse issues
            }
          },
          onerror: (err) => { throw err; },
          onclose: () => throttledLog("Stream closed."),
        });
      } finally {
        ctrl.abort();
      }

      // Fetch artifact
      const artUrl = withApiKey(api(`/simulate/${run_id}/artifact`), apiKey);
      const a = await fetch(artUrl, { headers: apiHeaders(apiKey) });
      const artTxt = await safeText(a);
      if (!a.ok) {
        if (looksLikeHTML(artTxt)) throw new Error("Misrouted to HTML (likely Vite/Netlify). Check API base.");
        throw new Error(`Artifact fetch failed: ${a.status} – ${artTxt}`);
      }
      const artf: MCArtifact = JSON.parse(artTxt);
      setArt(artf);
      setDrivers(artf.drivers || []);
      setProbUp(artf.prob_up_end || 0);
      setCurrentPrice((artf as any).spot ?? artf.median_path?.[0]?.[1] ?? null);

      // Save to recent runs
      setRunHistory((prev) => {
        const updated = [
          {
            id: run_id,
            symbol,
            horizon: hNum ?? 0,
            n_paths: paths,
            finishedAt: new Date().toISOString(),
            q50: artf.bands?.p50?.[artf.bands.p50.length - 1]?.[1] ?? null,
            probUp: artf.prob_up_end ?? null,
          },
          ...prev,
        ].slice(0, 20);
        try { localStorage.setItem("pp_runs", JSON.stringify(updated)); } catch {}
        return updated;
      });
    } catch (e: any) {
      throttledLog(`Error: ${e.message ?? e}`);
    } finally {
      setIsSimulating(false);
    }
  }

  // Median % change at horizon (if artifact exists)
  const kpiMedianDeltaPct = (() => {
    if (!art) return null;
    const s0 = art.median_path?.[0]?.[1] ?? 0;
    const sH = art.median_path?.at(-1)?.[1] ?? 0;
    if (!s0 || !Number.isFinite(s0) || !Number.isFinite(sH)) return null;
    return ((sH / s0 - 1) * 100);
  })();

  // —— Derived: recent runs for the right rail ——
  const recentRuns = (Array.isArray(safeRunHistory) ? safeRunHistory : [])
    .slice(-8)
    .reverse()
    .map(r => ({
      title: `${r.symbol} • H${r.horizon}d`,
      subtitle: `${r.n_paths.toLocaleString()} paths — ${new Date(r.finishedAt).toLocaleString()}`,
      onClick: () => setSymbol(r.symbol),
    }));
    //render
  return (
    <main className="min-h-screen bg-[#0b0b0d] text-[#F9F8F3]">
      <Toaster position="bottom-right" />
      {/* Wrap the main content to avoid full-page white if a child throws */}
      <ErrorBoundary>
        {/* Header */}
        <div className="px-4 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoTwinCore size={28} glow />
            <h1 className="text-xl font-semibold">SIMETRIX</h1>
          </div>
          <div className="flex items-center gap-3">
            <input
              type={showApiKey ? "text" : "password"}
              className="px-2 py-1 rounded bg-[#13161a] border border-[#23262b] text-sm"
              placeholder="API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              aria-label="API key"
              style={{ width: 260 }}
            />
            <button
              className="text-xs underline opacity-80"
              onClick={() => setShowApiKey((v) => !v)}
              aria-label="Toggle API visibility"
            >
              {showApiKey ? "Hide" : "Show"}
            </button>
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className="px-3 py-1 rounded bg-[#13161a] border border-[#23262b] text-sm"
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>
        </div>
        {/* KPI strip */}
        <Card className="mx-4 mt-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="opacity-60">Current</div>
              <div className="font-mono">
                {typeof currentPrice === "number" && Number.isFinite(currentPrice)
                  ? `$${currentPrice.toFixed(2)}`
                  : "—"}
              </div>
            </div>
            <div>
              <div className="opacity-60">P(up)</div>
              <div className="font-mono">{fmtPct(probMeta.v)}</div>
            </div>
            <div>
              <div className="opacity-60">Median Δ (H)</div>
              <div className="font-mono">
                {typeof kpiMedianDeltaPct === "number" ? `${kpiMedianDeltaPct.toFixed(1)}%` : "—"}
              </div>
            </div>
            <div>
              <div className="opacity-60">Bands</div>
              <div className="font-mono">{art ? "P80 / P95" : "—"}</div>
            </div>
          </div>
        </Card>
        {/* Controls + charts grid */}
        <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Simulation Controls */}
          <Card title="Simulation Controls">
            {/* labeled inputs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wide text-white/60">Ticker / Symbol</div>
                <input
                  className="w-full px-2 py-1 rounded bg-[#13161a] border border-[#23262b] text-sm"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g., NVDA"
                  aria-label="Ticker / Symbol"
                />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wide text-white/60">Horizon (days)</div>
                <input
                  type="number"
                  min={1}
                  className="w-full px-2 py-1 rounded bg-[#13161a] border border-[#23262b] text-sm"
                  value={horizon}
                  onChange={(e) => setHorizon(Number.isFinite(e.currentTarget.valueAsNumber) ? e.currentTarget.valueAsNumber : horizon)}
                  placeholder="30"
                  inputMode="numeric"
                  aria-label="Horizon in days"
                />
              </div>
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wide text-white/60">Paths</div>
                <input
                  type="number"
                  min={100}
                  step={100}
                  className="w-full px-2 py-1 rounded bg-[#13161a] border border-[#23262b] text-sm"
                  value={paths}
                  onChange={(e) => setPaths(Number.isFinite(e.currentTarget.valueAsNumber) ? e.currentTarget.valueAsNumber : paths)}
                  placeholder="2000"
                  inputMode="numeric"
                  aria-label="Number of Monte Carlo paths"
                />
              </div>
              <div className="space-y-1 col-span-2 md:col-span-4">
                <div className="text-[11px] uppercase tracking-wide text-white/60">X (Twitter) handles — optional</div>
                <input
                  className="w-full px-2 py-1 rounded bg-[#13161a] border border-[#23262b] text-sm"
                  value={xHandles}
                  onChange={(e) => setXHandles(e.target.value)}
                  placeholder="comma,separated,handles"
                  aria-label="X (Twitter) handles, optional"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input id="incOpt" type="checkbox" checked={includeOptions} onChange={(e) => setIncludeOptions(e.target.checked)} />
                Include options
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input id="incFut" type="checkbox" checked={includeFutures} onChange={(e) => setIncludeFutures(e.target.checked)} />
                Include futures
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input id="incNews" type="checkbox" checked={includeNews} onChange={(e) => setIncludeNews(e.target.checked)} />
                Include news
              </label>
            </div>
            {/* action buttons — now with hover + spinner */}
            <div className="mt-3 flex flex-wrap gap-2">
              <LoadingButton
                label="Train"
                loadingLabel="Training…"
                loading={isTraining}
                onClick={handleTrainModelClick}
              />
              <LoadingButton
                label="Predict"
                loadingLabel="Predicting…"
                loading={isPredicting}
                onClick={handleRunPredictClick}
              />
              <LoadingButton
                label="Run Simulation"
                loadingLabel={`Simulating…${typeof progress === "number" ? ` ${Math.round(progress)}%` : ""}`}
                loading={isSimulating}
                onClick={handleRunSimulationClick}
                className="bg-emerald-600/20 border-emerald-500/40 hover:bg-emerald-500/25"
              />
              <LoadingButton label="Label now" onClick={labelNowAction} />
              <LoadingButton label="Learn now" onClick={learnNowAction} />
            </div>
            {/* recent runs */}
            <div className="mt-4">
              <RecentRunsRail runs={safeRunHistory.slice(0, 50) as any} onSelect={handleSelectRecent} />
            </div>
          </Card>
          {/* Price Forecast */}
          <Card
            title="Price Forecast"
            actions={
              <CardMenu
                items={[
                  { label: "Export PNG", onClick: () => exportChart("fan"), disabled: !art },
                  { label: "Share link", onClick: () => shareChart("fan"), disabled: !art },
                ]}
              />
            }
            className="md:col-span-2"
          >
            <div data-chart="fan">
              <ErrorBoundary>
                <Suspense fallback={<ChartFallback />}>
                  {!art ? (
                    <EmptyState
                      text="Run a simulation to view."
                      actionLabel="Try NVDA 30d"
                      onAction={() => handlePreset({ symbol: "NVDA", horizon: 30, paths: 1000 })}
                    />
                  ) : (
                    <FanChart artifact={art} />
                  )}
                </Suspense>
              </ErrorBoundary>
              {art && (
                <div className="mt-2">
                  <InlineLegend />
                </div>
              )}
            </div>
          </Card>
          {/* Hit Probabilities */}
          <Card
            title="Hit Probabilities"
            actions={<CardMenu items={[{ label: "Export PNG", onClick: () => exportChart("hit"), disabled: !art }]} />}
          >
            <div data-chart="hit">
              <ErrorBoundary>
                <Suspense fallback={<ChartFallback />}>
                  {art?.hit_probs && Array.isArray(art.hit_probs.thresholds_abs) && Array.isArray(art.hit_probs.probs_by_day) ? (
                    <HitProbabilityRibbon
                      hit={{
                        thresholds_abs: art.hit_probs.thresholds_abs ?? [],
                        probs_by_day: art.hit_probs.probs_by_day ?? [],
                      }}
                    />
                  ) : (
                    <EmptyState
                      text="Run a simulation with hit probabilities."
                      actionLabel="Try NVDA 30d"
                      onAction={() => handlePreset({ symbol: "NVDA", horizon: 30, paths: 1000 })}
                    />
                  )}
                </Suspense>
              </ErrorBoundary>
            </div>
          </Card>
          {/* Terminal Distribution */}
          <Card
            title="Terminal Distribution"
            actions={<CardMenu items={[{ label: "Export PNG", onClick: () => exportChart("terminal"), disabled: !art }]} />}
          >
            <div data-chart="terminal">
              <ErrorBoundary>
                <Suspense fallback={<ChartFallback />}>
                  {Array.isArray(art?.terminal_prices) && art!.terminal_prices.length ? (
                    <TerminalDistribution
                      prices={(art!.terminal_prices || []).filter(
                        (v): v is number => typeof v === "number" && Number.isFinite(v)
                      )}
                    />
                  ) : (
                    <EmptyState
                      text="No terminal distribution yet."
                      actionLabel="Run NVDA 30d"
                      onAction={() => handlePreset({ symbol: "NVDA", horizon: 30, paths: 1000 })}
                    />
                  )}
                </Suspense>
              </ErrorBoundary>
            </div>
          </Card>
          {/* Drivers */}
          <Card
            title="Drivers (Explainability)"
            actions={<CardMenu items={[{ label: "Export PNG", onClick: () => exportChart("drivers"), disabled: !drivers?.length }]} />}
          >
            <div data-chart="drivers">
              <ErrorBoundary>
                <Suspense fallback={<ChartFallback />}>
                  {drivers?.length ? (
                    <DriversWaterfall
                      drivers={drivers.map((d) => ({
                        feature: d.feature,
                        weight: typeof d.weight === "number" && Number.isFinite(d.weight) ? d.weight : 0,
                      }))}
                    />
                  ) : (
                    <EmptyState
                      text="No drivers yet."
                      actionLabel="Try NVDA 30d"
                      onAction={() => handlePreset({ symbol: "NVDA", horizon: 30, paths: 1000 })}
                    />
                  )}
                </Suspense>
              </ErrorBoundary>
            </div>
          </Card>
          {/* Target Ladder */}
          <Card
            title="Target Ladder"
            actions={<CardMenu items={[{ label: "Export PNG", onClick: () => exportChart("ladder"), disabled: !art }]} />}
          >
            <div data-chart="ladder">
              <ErrorBoundary>
                <Suspense fallback={<ChartFallback />}>
                  {art?.hit_probs && Array.isArray(art.hit_probs.thresholds_abs) && Array.isArray(art.hit_probs.probs_by_day) ? (
                    <TargetLadder
                      items={art.hit_probs.thresholds_abs.map((thr, i) => {
                        const lastT = Math.max(0, art.median_path.length - 1);
                        const raw = art.hit_probs!.probs_by_day?.[i]?.[lastT];
                        const p = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
                        const S0 = art.median_path?.[0]?.[1] ?? 0;
                        const pct = S0 ? Math.round((thr / S0 - 1) * 100) : 0;
                        return { label: `${pct >= 0 ? "+" : ""}${pct}%`, p };
                      })}
                    />
                  ) : (
                    <EmptyState
                      text="Run a simulation to populate the ladder."
                      actionLabel="Try NVDA 30d"
                      onAction={() => handlePreset({ symbol: "NVDA", horizon: 30, paths: 1000 })}
                    />
                  )}
                </Suspense>
              </ErrorBoundary>
            </div>
          </Card>
          {/* Run Summary */}
          <Card title="Run Summary">
            <ErrorBoundary>
              {art ? (
                <SummaryCard
                  probUpLabel={fmtPct(probMeta.v)}
                  probUpColor={probMeta.color}
                  progress={progress}
                  currentPrice={typeof currentPrice === "number" && Number.isFinite(currentPrice) ? currentPrice : undefined}
                  eod={eod || undefined}
                />
              ) : (
                <EmptyState
                  text="Run a simulation to view summary."
                  actionLabel="Try NVDA 30d"
                  onAction={() => handlePreset({ symbol: "NVDA", horizon: 30, paths: 1000 })}
                />
              )}
            </ErrorBoundary>
          </Card>
          {/* Activity Log */}
          <Card title="Activity Log">
            <div ref={logRef} className={`overflow-auto ${LOG_HEIGHT} whitespace-pre-wrap text-xs`}>
              {(Array.isArray(logMessages) ? logMessages : []).map((m, i) => (
                <div key={i} className="opacity-80">
                  {m}
                </div>
              ))}
            </div>
          </Card>
          {/* Scenarios */}
          <Card title="Scenarios" className="md:col-span-2">
            <ErrorBoundary>
              <Suspense fallback={<ChartFallback />}>
                {art ? (
                  <ScenarioTiles artifact={art} />
                ) : (
                  <EmptyState
                    text="—"
                    actionLabel="Run NVDA 30d"
                    onAction={() => handlePreset({ symbol: "NVDA", horizon: 30, paths: 1000 })}
                  />
                )}
              </Suspense>
            </ErrorBoundary>
          </Card>
          {/* Track Record */}
          <Card title="Track Record">
            <ErrorBoundary>
              <TrackRecordPanel runs={safeRunHistory} />
            </ErrorBoundary>
          </Card>
          {/* News */}
          <Card title="News">
            <ErrorBoundary>
              {includeNews ? (
                <NewsList
                  items={Array.isArray(newsItems) ? newsItems : []}
                  loading={!!newsLoading}
                  error={newsError}
                  onLoadMore={loadMore}
                  nextCursor={nextCursor}
                />
              ) : (
                <div className="text-xs opacity-70">Enable “Include news” to fetch recent headlines.</div>
              )}
            </ErrorBoundary>
          </Card>
          {/* Challenges */}
          <Card title="Challenges">
            <ErrorBoundary>
              <ChallengePanel
                symbol={symbol}
                actualPrice={typeof currentPrice === "number" && Number.isFinite(currentPrice) ? currentPrice : undefined}
              />
            </ErrorBoundary>
          </Card>
        </div>
      </ErrorBoundary>
      {/* Right rail — recent only */}
      <ErrorBoundary>
        <RightRail recent={recentRuns} className="xl:fixed xl:right-4 xl:top-24 xl:bottom-6" />
      </ErrorBoundary>
      {/* Footer actions */}
      <div className="px-4 py-6 flex items-center gap-2">
        <button
          className="px-3 py-1 rounded bg-[#1a1f25] border border-[#2a2f36] text-sm"
          onClick={() => exportArtifact(art)}
          disabled={!art}
        >
          Export artifact JSON
        </button>
      </div>
    </main>
  );
}

//—— Utilities ——
function buildLadderItems(art: MCArtifact) {
  if (!art?.hit_probs?.thresholds_abs?.length) return [];
  const lastT = Math.max(0, art.median_path.length - 1);
  const S0 = art.median_path?.[0]?.[1] ?? 0;
  return art.hit_probs.thresholds_abs.map((thr, i) => {
    const p = art.hit_probs!.probs_by_day?.[i]?.[lastT] ?? 0;
    const pct = S0 ? Math.round((thr / S0 - 1) * 100) : 0;
    return { label: `${pct >= 0 ? "+" : ""}${pct}%`, p };
  });
}

function exportArtifact(art: MCArtifact | null) {
  if (!art) return;
  const blob = new Blob([JSON.stringify(art, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mc_${art.symbol}_${art.horizon_days}d.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Exported artifact as JSON");
}
