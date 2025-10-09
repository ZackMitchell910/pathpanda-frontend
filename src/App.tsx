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
import { useNews } from "./hooks/useNews";
import { InlineLegend } from "./components/InlineLegend";
import { ChartActions } from "./components/ChartActions";
import { SummaryCard } from "./components/SummaryCard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ChallengePanel } from "./components/ChallengePanel";
import RightRail from "./components/RightRail";
import { TrackRecordPanel } from "./components/TrackRecordPanel";
import { PP_COLORS } from "./theme/chartTheme";


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

// ---- API base + helpers (keep hard fallback so calls never hit Netlify) ----
const RAW_API_BASE =
  (typeof window !== "undefined" && (window as any).__PP_API_BASE__) ||
  (import.meta as any)?.env?.VITE_PREDICTIVE_API || // Vite (Netlify)
  (import.meta as any)?.env?.VITE_API_BASE ||       // existing fallback if present
  "https://pathpanda-api.onrender.com";            // TEMP hard fallback

const API_BASE = RAW_API_BASE ? RAW_API_BASE.replace(/\/+$/, "") : "";
const api = (p: string) => (API_BASE ? `${API_BASE}${p}` : p);

const apiHeaders = (key: string) => ({
  "Content-Type": "application/json",
  "X-API-Key": key,
});

async function safeText(r: Response) {
  try {
    return await r.text();
  } catch {
    return "<no body>";
  }
}
function looksLikeHTML(s: string) {
  return /^\s*<!doctype html>|<html/i.test(s);
}

const PandaIcon = () => (
  <svg className="w-8 h-8 text-[#F9F8F3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-4 7c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2h-8v-2z" />
  </svg>
);

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

  const [apiKey, setApiKey] = useState(() => {
    if (typeof window === "undefined") return "";
    const stored = localStorage.getItem("apiKey") || "";
    return stored && !stored.toLowerCase().includes("error") ? stored.trim() : "";
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
  const [activeTab, setActiveTab] = useState<"risk" | "scenarios" | "track">("risk");

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

  const { items: newsItems, nextCursor, loading: newsLoading, error: newsError, loadMore } = useNews({
    symbol,
    includeNews,
    apiKey,
    limit: 6,
    days: 7,
    onLog: throttledLog,
    retry: 0,
  });

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

  // —— Quick presets ——
  const QUICK_PRESETS = [
    { symbol: "NVDA", horizon: 30, paths: 1000 },
    { symbol: "TSLA", horizon: 60, paths: 2000 },
    { symbol: "AAPL", horizon: 30, paths: 1500 },
    { symbol: "NIO", horizon: 30, paths: 1500 },
  ];

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
                art.median_path[i][1].toFixed(2),
                art.bands.p80_low[i][1].toFixed(2),
                art.bands.p80_high[i][1].toFixed(2),
                art.bands.p95_low[i][1].toFixed(2),
                art.bands.p95_high[i][1].toFixed(2),
              ]),
            ];
            break;
          case "hit":
            csvData = [
              ["Day", ...(art.hit_probs?.thresholds_abs.map((t) => `Above ${t.toFixed(2)}`) || [])],
              ...art.median_path.map(([t], i) => [
                `D${t}`,
                ...(art.hit_probs?.probs_by_day.map((probs) => probs[i]?.toFixed(2) || "0") || []),
              ]),
            ];
            break;
          case "terminal":
            csvData = [["Price", "Frequency"], ...(art.terminal_prices?.map((p) => [p.toFixed(2), "1"]) || [])];
            break;
          case "drivers":
            csvData = [["Driver", "Weight"], ...drivers.map((d) => [d.feature, d.weight.toFixed(2)])];
            break;
          case "ladder":
            csvData = [["Target", "Probability"], ...buildLadderItems(art).map((d) => [d.label, (d.p * 100).toFixed(2)])];
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
    if (!apiKey) return toast.error("Enter API key first");
    try {
      const r = await fetch(api("/outcomes/label"), { method: "POST", headers: apiHeaders(apiKey) });
      if (!r.ok) {
        const body = await safeText(r);
        if (looksLikeHTML(body)) throw new Error("Misrouted to HTML (likely Netlify 404). Check API base or proxy.");
        throw new Error(`HTTP ${r.status} ${body}`);
      }
      const data = await r.json();
      toast.success(`Labeled ${data.labeled ?? 0} outcomes`);
    } catch (e: any) {
      toast.error(`Labeling failed: ${e.message || e}`);
    }
  }

  async function learnNowAction() {
    if (!apiKey) return toast.error("Enter API key first");
    try {
      const r = await fetch(api("/learn/online"), {
        method: "POST",
        headers: apiHeaders(apiKey),
        body: JSON.stringify({ symbol, steps: 50, batch: 32 }),
      });
      if (!r.ok) {
        const body = await safeText(r);
        if (looksLikeHTML(body)) throw new Error("Misrouted to HTML (likely Netlify 404). Check API base or proxy.");
        throw new Error(`HTTP ${r.status} ${body}`);
      }
      const data = await r.json();
      toast.success(`Online learn OK — w[0]=${data.model?.coef?.[0]?.toFixed(3) ?? "?"}`);
    } catch (e: any) {
      toast.error(`Online learn failed: ${e.message || e}`);
    }
  }

  async function trainModel() {
    if (!apiKey) {
      throttledLog("Error: Please enter a valid API key");
      return;
    }
    throttledLog("Training model...");
    try {
      const resp = await fetch(api("/train"), {
        method: "POST",
        headers: apiHeaders(apiKey),
        body: JSON.stringify({ symbol, lookback_days: 180 }),
      });
      if (!resp.ok) {
        const body = await safeText(resp);
        if (looksLikeHTML(body)) throw new Error("Misrouted to HTML (likely Netlify 404). Check API base or proxy.");
        throw new Error(`Train failed: ${resp.status} – ${body}`);
      }
      throttledLog("Model trained successfully.");
    } catch (e: any) {
      throttledLog(`Error: ${e.message || e}`);
    }
  }

  async function runPredict() {
    if (!apiKey) {
      throttledLog("Error: Please enter a valid API key");
      return;
    }
    throttledLog("Running prediction...");
    try {
      const h = typeof horizon === "number" ? horizon : 30;
      const resp = await fetch(api("/predict"), {
        method: "POST",
        headers: apiHeaders(apiKey),
        body: JSON.stringify({ symbol, horizon_days: h }),
      });
      if (!resp.ok) {
        const body = await safeText(resp);
        if (looksLikeHTML(body)) throw new Error("Misrouted to HTML (likely Netlify 404). Check API base or proxy.");
        throw new Error(`Predict failed: ${resp.status} – ${body}`);
      }
      const js = await resp.json();
      throttledLog(`Prediction: Prob Up Next = ${(js.prob_up_next * 100).toFixed(2)}%`);
    } catch (e: any) {
      throttledLog(`Error: ${e.message || e}`);
    }
  }

  async function runSimulation() {
    if (!apiKey) {
      throttledLog("Error: Please enter a valid API key");
      return;
    }
    if (horizonNum == null) {
      throttledLog("Error: Please enter a horizon (days).");
      return;
    }
    if (horizonNum > 365) {
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
        horizon_days: Number(horizonNum),
        n_paths: Number(paths),
        timespan: "day",
        include_news: !!includeNews,
        include_options: !!includeOptions,
        include_futures: !!includeFutures,
        ...(xHandles.trim() ? { x_handles: xHandles.trim() } : {}),
      };

      // Kick off
      const resp = await fetch(api("/simulate"), {
        method: "POST",
        headers: apiHeaders(apiKey),
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const body = await safeText(resp);
        if (looksLikeHTML(body)) throw new Error("Misrouted to HTML (likely Netlify 404). Check API base or proxy.");
        throw new Error(`HTTP ${resp.status} – ${body}`);
      }
      const { run_id } = await resp.json();
      setRunId(run_id);
      throttledLog(`Queued run_id: ${run_id}`);

      // Stream
      const ctrl = new AbortController();
      try {
        await fetchEventSource(api(`/simulate/${run_id}/stream`), {
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
              /* ignore parse blips */
            }
          },
          onerror: (err) => {
            throw err;
          },
          onclose: () => throttledLog("Stream closed."),
        });
      } finally {
        ctrl.abort();
      }

      // Artifact
      const a = await fetch(api(`/simulate/${run_id}/artifact`), { headers: apiHeaders(apiKey) });
      if (!a.ok) {
        const body = await safeText(a);
        if (looksLikeHTML(body)) throw new Error("Misrouted to HTML (likely Netlify 404). Check API base or proxy.");
        throw new Error(`Artifact fetch failed: ${a.status} – ${body}`);
      }
      const artf: MCArtifact = await a.json();
      setArt(artf);
      setDrivers(artf.drivers || []);
      setProbUp(artf.prob_up_end || 0);
      setCurrentPrice((artf as any).spot ?? artf.median_path?.[0]?.[1] ?? null);

      setRunHistory((prev) => {
        const updated = [
          {
            id: run_id,
            symbol,
            horizon: horizonNum ?? 0,
            n_paths: paths,
            finishedAt: new Date().toISOString(),
            q50: artf.bands.p50?.[artf.bands.p50.length - 1]?.[1] ?? null,
            probUp: artf.prob_up_end ?? null,
          },
          ...prev,
        ].slice(0, 20);
        try {
          localStorage.setItem("pp_runs", JSON.stringify(updated));
        } catch {}
        return updated;
      });
    } catch (e: any) {
      throttledLog(`Error: ${e.message ?? e}`);
    } finally {
      setIsSimulating(false);
    }
  }

  // —— Chart data (for inline examples, if needed) ——
  const chartData = useMemo(() => {
    if (!art) return null;
    return {
      labels: art.median_path.map(([t]) => `D${t}`),
      datasets: [
        {
          label: "Median",
          data: art.median_path.map(([, y]) => y),
          borderColor: PP_COLORS.median,
          borderWidth: 2,
          pointRadius: 0,
        },
        {
          label: "80% Range",
          data: art.bands.p80_high.map(([, y]) => y),
          borderWidth: 0,
          fill: "+1",
          backgroundColor: PP_COLORS.p80,
        },
        {
          label: "_p80_low_hidden",
          data: art.bands.p80_low.map(([, y]) => y),
          borderWidth: 0,
          fill: false,
        },
      ],
    };
  }, [art]);

  // —— Render ——
  return (
    <main className="min-h-screen bg-[#0b0b0d] text-[#F9F8F3]">
      <Toaster position="bottom-right" />

      {/* Header */}
      <div className="px-4 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PandaIcon />
          <h1 className="text-xl font-semibold">PathPanda — Predictive Twin</h1>
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

      {/* Controls */}
      <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Simulation Controls">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input
              className="px-2 py-1 rounded bg-[#13161a] border border-[#23262b] text-sm"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Symbol (e.g., NVDA)"
            />
            <input
              className="px-2 py-1 rounded bg-[#13161a] border border-[#23262b] text-sm"
              value={horizon}
              onChange={(e) => setHorizon(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Horizon (days)"
            />
            <input
              className="px-2 py-1 rounded bg-[#13161a] border border-[#23262b] text-sm"
              value={paths}
              onChange={(e) => setPaths(Number(e.target.value))}
              placeholder="Paths"
            />
            <input
              className="px-2 py-1 rounded bg-[#13161a] border border-[#23262b] text-sm col-span-2 md:col-span-4"
              value={xHandles}
              onChange={(e) => setXHandles(e.target.value)}
              placeholder="X (Twitter) handles, comma-separated (optional)"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeOptions} onChange={(e) => setIncludeOptions(e.target.checked)} />
              Include options
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeFutures} onChange={(e) => setIncludeFutures(e.target.checked)} />
              Include futures
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeNews} onChange={(e) => setIncludeNews(e.target.checked)} />
              Include news
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleTrainModelClick}
              disabled={isTraining}
              className="px-3 py-1 rounded bg-[#1a1f25] border border-[#2a2f36] text-sm"
            >
              {isTraining ? "Training…" : "Train"}
            </button>
            <button
              onClick={handleRunPredictClick}
              disabled={isPredicting}
              className="px-3 py-1 rounded bg-[#1a1f25] border border-[#2a2f36] text-sm"
            >
              {isPredicting ? "Predicting…" : "Predict"}
            </button>
            <button
              onClick={handleRunSimulationClick}
              disabled={isSimulating}
              className="px-3 py-1 rounded bg-[#1a1f25] border border-[#2a2f36] text-sm"
            >
              {isSimulating ? "Simulating…" : "Run Simulation"}
            </button>
            <button onClick={labelNowAction} className="px-3 py-1 rounded bg-[#1a1f25] border border-[#2a2f36] text-sm">
              Label now
            </button>
            <button onClick={learnNowAction} className="px-3 py-1 rounded bg-[#1a1f25] border border-[#2a2f36] text-sm">
              Learn now
            </button>
          </div>

          {/* Quick presets */}
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_PRESETS.map((p) => (
              <button
                key={p.symbol}
                onClick={() => handlePreset(p)}
                className="px-2 py-1 rounded bg-[#13161a] border border-[#23262b] text-xs"
              >
                {p.symbol} • {p.horizon}d • {p.paths.toLocaleString()}
              </button>
            ))}
          </div>
        </Card>

        <Card
          title="Price Forecast"
          actions={<ChartActions onExport={() => exportChart("fan")} onShare={() => shareChart("fan")} />}
          className="md:col-span-2"
        >
          <div data-chart="fan">
            <ErrorBoundary>
              <Suspense fallback={<ChartFallback />}>
                {art ? <FanChart artifact={art} /> : <div className="text-xs opacity-70">Run a simulation to view.</div>}
              </Suspense>
            </ErrorBoundary>
            {art && (
              <div className="mt-2">
                <InlineLegend />
              </div>
            )}
          </div>
        </Card>

        <Card title="Hit Probabilities" actions={<ChartActions onExport={() => exportChart("hit")} />}>
          <div data-chart="hit">
            <Suspense fallback={<ChartFallback />}>
              {art?.hit_probs ? (
                <HitProbabilityRibbon hit={art.hit_probs} />
              ) : (
                <div className="text-xs opacity-70">Run a simulation with hit probabilities.</div>
              )}
            </Suspense>
          </div>
        </Card>

        <Card title="Terminal Distribution" actions={<ChartActions onExport={() => exportChart("terminal")} />}>
          <div data-chart="terminal">
            <Suspense fallback={<ChartFallback />}>
              {art?.terminal_prices?.length ? (
                <TerminalDistribution prices={art.terminal_prices} />
              ) : (
                <div className="text-xs opacity-70">No terminal distribution yet.</div>
              )}
            </Suspense>
          </div>
        </Card>

        <Card title="Drivers (Explainability)" actions={<ChartActions onExport={() => exportChart("drivers")} />}>
          <div data-chart="drivers">
            <Suspense fallback={<ChartFallback />}>
              {drivers?.length ? (
                <DriversWaterfall drivers={drivers} />
              ) : (
                <div className="text-xs opacity-70">No drivers yet.</div>
              )}
            </Suspense>
          </div>
        </Card>

        <Card title="Target Ladder" actions={<ChartActions onExport={() => exportChart("ladder")} />}>
          <div data-chart="ladder">
            <Suspense fallback={<ChartFallback />}>
              {art?.hit_probs ? (
                <TargetLadder
                  items={(art.hit_probs.thresholds_abs || []).map((thr, i) => {
                    const lastT = art.median_path.length - 1;
                    const p = art.hit_probs!.probs_by_day?.[i]?.[lastT] ?? 0;
                    const S0 = art.median_path?.[0]?.[1] ?? 0;
                    const pct = S0 ? Math.round((thr / S0 - 1) * 100) : 0;
                    return { label: `${pct >= 0 ? "+" : ""}${pct}%`, p };
                  })}
                />
              ) : (
                <div className="text-xs opacity-70">Run a simulation to populate the ladder.</div>
              )}
            </Suspense>
          </div>
        </Card>

        <Card title="Run Summary">
          {art ? (
            <SummaryCard
              probUpLabel={fmtPct(probMeta.v)}
              probUpColor={probMeta.color}
              progress={progress}
              currentPrice={isNum(currentPrice) ? currentPrice : undefined}
              eod={eod || undefined}
            />
          ) : (
            <div className="text-xs opacity-70">Run a simulation to view summary.</div>
          )}
        </Card>
        <Card title="Activity Log">
          <div ref={logRef} className={`overflow-auto ${LOG_HEIGHT} whitespace-pre-wrap text-xs`}>
            {logMessages.map((m, i) => (
              <div key={i} className="opacity-80">
                {m}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Scenarios" className="md:col-span-2">
          <Suspense fallback={<ChartFallback />}>
            {art ? <ScenarioTiles artifact={art} /> : <div className="text-xs opacity-70">—</div>}
          </Suspense>
        </Card>

        <Card title="Track Record">
          <TrackRecordPanel runs={safeRunHistory} />
        </Card>

        <Card title="News">
          {includeNews ? (
            <NewsList items={newsItems} loading={newsLoading} error={newsError} onLoadMore={loadMore} nextCursor={nextCursor} />
          ) : (
            <div className="text-xs opacity-70">Enable “Include news” to fetch recent headlines.</div>
          )}
        </Card>

        <Card title="Challenges">
          <ChallengePanel />
        </Card>
      </div>

      {/* Right rail */}
      <RightRail />

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

// —— Utilities ——
function buildLadderItems(art: MCArtifact) {
  if (!art?.hit_probs?.thresholds_abs?.length) return [];
  const lastT = art.median_path.length - 1;
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
