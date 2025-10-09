import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from "react";
import { motion } from "framer-motion";
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

// ---- API base + helpers ----
const RAW_API_BASE =
  (typeof window !== "undefined" && (window as any).__PP_API_BASE__) ||
  (import.meta as any)?.env?.VITE_PREDICTIVE_API || // Netlify (Vite) var
  (import.meta as any)?.env?.VITE_API_BASE ||       // your existing var (if present)
  "https://pathpanda-api.onrender.com";            // <-- TEMP hard fallback so calls don't hit Netlify

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

  const logRef = useRef<HTMLDivElement | null>(null);

  // helpful runtime check
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
    // ensure the hook also uses api() internally for any server routes it calls
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

  // Run actions
  const handleRunPredictClick = useCallback(async () => {
    if (isPredicting) return;
    setIsPredicting(true);
    try {
      await runPredict();
    } finally {
      setIsPredicting(false);
    }
  }, [isPredicting, runPredict]);

  const handleTrainModelClick = useCallback(async () => {
    if (isTraining) return;
    setIsTraining(true);
    try {
      await trainModel();
    } finally {
      setIsTraining(false);
    }
  }, [isTraining, trainModel]);

  // ---------------- Export / Share ----------------
  type ChartKind = "fan" | "hit" | "terminal" | "drivers" | "ladder";

  function downloadCSV(rows: (string | number)[][], filename: string) {
    const csv = rows
      .map(r =>
        r
          .map(x =>
            typeof x === "string" && x.includes(",")
              ? `"${x.replace(/"/g, '""')}"`
              : String(x)
          )
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPNG(canvas: HTMLCanvasElement, filename: string) {
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }

  // Build ladder rows once (used by export + UI)
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

  // Export the currently rendered chart (PNG + CSV when available)
  const exportChart = async (kind: ChartKind) => {
    try {
      // 1) Try to grab a canvas for PNG
      const container = document.querySelector(`[data-chart="${kind}"]`) as HTMLElement | null;
      const canvas = container?.querySelector("canvas") as HTMLCanvasElement | null;

      // 2) Build CSV rows by chart kind
      let csv: (string | number)[][] = [];

      if (kind === "fan" && art) {
        csv = [["Day", "Median"]];
        for (const [d, v] of art.median_path) csv.push([d, v]);
      }

      if (kind === "hit" && art?.hit_probs) {
        const lastIdx = art.median_path.length - 1;
        csv = [["Threshold", "Probability"]];
        (art.hit_probs.thresholds_abs || []).forEach((thr, i) => {
          const p = art.hit_probs!.probs_by_day?.[i]?.[lastIdx] ?? 0;
          csv.push([thr, p]);
        });
      }

      if (kind === "terminal" && art?.terminal_prices?.length) {
        csv = [["Price"]];
        art.terminal_prices.forEach(p => csv.push([p]));
      }

      if (kind === "drivers" && drivers?.length) {
        csv = [["Feature", "Weight"]];
        drivers.forEach(d => csv.push([(d.name ?? (d as any).feature) as string, d.weight]));
      }

      if (kind === "ladder" && art) {
        const items = buildLadderItems(art);
        csv = [["Target", "Probability"]];
        items.forEach(d => csv.push([d.label, d.p]));
      }

      // 3) Do PNG (if a canvas is present)
      if (canvas) {
        const pngName = `${kind}_${art?.symbol ?? "chart"}.png`;
        downloadPNG(canvas, pngName);
      }

      // 4) Do CSV (if we have any rows)
      if (csv.length > 1) {
        const csvName = `${kind}_${art?.symbol ?? "data"}.csv`;
        downloadCSV(csv, csvName);
        toast.success(`Exported ${kind.toUpperCase()} as ${canvas ? "PNG and " : ""}CSV`);
        return;
      }

      // 5) If no data at all
      if (!canvas) {
        toast.error("No data available for export");
      } else {
        toast.success(`Exported ${kind.toUpperCase()} as PNG`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Export failed");
    }
  };

  // Share using Web Share API / Clipboard as a fallback
  const shareChart = async (kind: ChartKind) => {
    try {
      const container = document.querySelector(`[data-chart="${kind}"]`) as HTMLElement | null;
      const canvas = container?.querySelector("canvas") as HTMLCanvasElement | null;
      if (!canvas) {
        toast.error("Nothing to share yet");
        return;
      }
      const blob = await (await fetch(canvas.toDataURL("image/png"))).blob();

      // Web Share Level 2 (files)
      if ((navigator as any).canShare && (navigator as any).share) {
        const file = new File([blob], `${kind}.png`, { type: "image/png" });
        if ((navigator as any).canShare({ files: [file] })) {
          await (navigator as any).share({
            title: `Sim chart: ${kind}`,
            text: `${art?.symbol ?? ""} ${kind}`,
            files: [file],
          });
          return;
        }
      }

      // Clipboard fallback
      if (navigator.clipboard && "write" in navigator.clipboard) {
        const item = new ClipboardItem({ "image/png": blob });
        // @ts-ignore
        await navigator.clipboard.write([item]);
        toast.success("Chart copied to clipboard");
        return;
      }

      // Last resort: download
      downloadPNG(canvas, `${kind}_${art?.symbol ?? "chart"}.png`);
      toast.success("Downloaded chart PNG");
    } catch (e) {
      console.error(e);
      toast.error("Share failed");
    }
  };

  // —— Backend calls ——
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
            horizon: hNum,
            n_paths: paths,
            finishedAt: new Date().toISOString(),
            q50: artf.bands.p50?.[artf.bands.p50.length - 1]?.[1] ?? null,
            probUp: artf.prob_up_end ?? null,
          },
          ...prev,
        ].slice(0, 20);
        try {
          if (typeof window !== "undefined") localStorage.setItem("pp_runs", JSON.stringify(updated));
        } catch {}
        return updated;
      });
    } catch (e: any) {
      throttledLog(`Error: ${e.message ?? e}`);
    } finally {
      setIsSimulating(false);
    }
  }

  // —— Chart data ——
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
            <button
              onClick={labelNowAction}
              className="px-3 py-1 rounded bg-[#1a1f25] border border-[#2a2f36] text-sm"
            >
              Label now
            </button>
            <button
              onClick={learnNowAction}
              className="px-3 py-1 rounded bg-[#1a1f25] border border-[#2a2f36] text-sm"
            >
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
                {art ? (
                  <FanChart data={art} />
                ) : (
                  <div className="text-xs opacity-70">Run a simulation to view.</div>
                )}
              </Suspense>
            </ErrorBoundary>
            {art && (
              <div className="mt-2">
                <InlineLegend
                  items={[
                    { swatch: PP_COLORS.median, label: "Median" },
                    { swatch: PP_COLORS.p80, label: "80% Range" },
                  ]}
                />
              </div>
            )}
          </div>
        </Card>

        <Card
          title="Hit Probabilities"
          actions={<ChartActions onExport={() => exportChart("hit")} onShare={() => shareChart("hit")} />}
        >
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

        <Card
          title="Terminal Distribution"
          actions={<ChartActions onExport={() => exportChart("terminal")} onShare={() => shareChart("terminal")} />}
        >
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

        <Card
          title="Drivers (Explainability)"
          actions={<ChartActions onExport={() => exportChart("drivers")} onShare={() => shareChart("drivers")} />}
        >
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

        <Card
          title="Target Ladder"
          actions={<ChartActions onExport={() => exportChart("ladder")} onShare={() => shareChart("ladder")} />}
        >
          <div data-chart="ladder">
            <Suspense fallback={<ChartFallback />}>
              {art ? (
                <div className="mt-2">
                  <InlineLegend
                    items={[
                      { swatch: PP_COLORS.median, label: "Median" },
                      { swatch: PP_COLORS.p80, label: "80% Range" },
                    ]}
                  />
                  {/* TODO: render ladder viz here (or pass computed items into your TargetLadder component) */}
                </div>
              ) : (
                <div className="text-xs opacity-70">Run a simulation to populate the ladder.</div>
              )}
            </Suspense>
          </div>
        </Card>

        <Card title="Run Summary">
          <SummaryCard
            probUpLabel={fmtPct(probMeta.v)}
            probUpColor={probMeta.color}
            progress={progress}
            currentPrice={currentPrice ?? undefined}
            eod={eod || undefined}
          />
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
          <TrackRecordPanel />
        </Card>

        <Card title="News">
          {includeNews ? (
            <NewsList
              items={newsItems}
              loading={newsLoading}
              error={newsError}
              onLoadMore={loadMore}
              nextCursor={nextCursor}
              symbol={symbol}
            />
          ) : (
            <div className="text-xs opacity-70">Enable “Include news” to fetch recent headlines.</div>
          )}
        </Card>

        <Card title="Challenges">
          <ChallengePanel symbol={symbol} userPrediction={userPrediction} />
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

// —— Utilities ——
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
  const terminalPrices = art?.terminal_prices ?? [];
  const var95 = art?.var_es?.var95 ?? 0;
  const es95 = art?.var_es?.es95 ?? 0;
  const S0 = art?.median_path?.[0]?.[1] ?? 0;

  const pathMatrixAbove = (tIndex: number, thresholdAbs: number) => {
    const hp = art?.hit_probs;
    if (!hp) return 0;
    let best = 0, bestDiff = Infinity;
    hp.thresholds_abs.forEach((thr, i) => {
      const diff = Math.abs(thr - thresholdAbs);
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    });
    return hp.probs_by_day?.[best]?.[tIndex] ?? 0;
  };

  const targetLadderData = useMemo(() => {
    const hp = art?.hit_probs;
    if (!hp) return [];
    const lastT = art?.median_path?.length ? art.median_path.length - 1 : 0;
    const labels = ["-5%", "0%", "+5%", "+10%"];
    return hp.thresholds_abs.map((thr, i) => ({
      label: labels[i] ?? `${Math.round(((thr / (S0 || 1)) - 1) * 100)}%`,
      p: hp.probs_by_day?.[i]?.[lastT] ?? 0,
    }));
  }, [art, S0]);

  const scenarioReps = art
    ? [
        { label: "Bear (≈p05)", path: art.bands.p95_low },
        { label: "Base (p50)",  path: art.median_path },
        { label: "Bull (≈p95)", path: art.bands.p95_high },
      ]
    : [];

  // --- Tabs (now using Card `actions` slot) ---
  const tabs = art
    ? [
        {
          id: "risk",
          label: "Risk",
          content: (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Price Forecast */}
              <motion.div className="md:col-span-2" initial={{ y: 20 }} animate={{ y: 0 }} transition={{ duration: 0.3 }}>
                <Card title="Price Forecast" collapsible actions={<ChartActions onExport={() => exportChart("fan")} onShare={() => shareChart("fan")} />}>
                  <Suspense fallback={<ChartFallback />}>
                    <FanChart data={art} />
                  </Suspense>
                </Card>
              </motion.div>

              {/* Hit Probabilities */}
              <motion.div initial={{ y: 20 }} animate={{ y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
                <Card title="Hit Probabilities" collapsible actions={<ChartActions onExport={() => exportChart("hit")} onShare={() => shareChart("hit")} />}>
                  <Suspense fallback={<ChartFallback />}>
                    <HitProbabilityRibbon
                      artifact={{ symbol: art.symbol, horizon_days: art.horizon_days, median_path: art.median_path, bands: art.bands }}
                      thresholds={[-0.05, 0, 0.05, 0.1]}
                      S0={S0}
                      pathMatrixAbove={pathMatrixAbove}
                    />
                  </Suspense>
                </Card>
              </motion.div>

              {/* Outcomes at Horizon */}
              <motion.div initial={{ y: 20 }} animate={{ y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
                <Card title="Outcomes at Horizon" collapsible actions={<ChartActions onExport={() => exportChart("terminal")} onShare={() => shareChart("terminal")} />}>
                  <Suspense fallback={<ChartFallback />}>
                    <TerminalDistribution
                      pathsTerminal={terminalPrices}
                      ptiles={{ p05: art.bands.p95_low.at(-1)?.[1], p50: art.bands.p50.at(-1)?.[1], p95: art.bands.p95_high.at(-1)?.[1] }}
                    />
                  </Suspense>
                </Card>
              </motion.div>

              {/* Target Ladder */}
              <motion.div initial={{ y: 20 }} animate={{ y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
                <Card title="Target Ladder" collapsible actions={<ChartActions onExport={() => exportChart("ladder")} onShare={() => shareChart("ladder")} />}>
                  <Suspense fallback={<ChartFallback />}>
                    <TargetLadder probs={targetLadderData} />
                  </Suspense>
                </Card>
              </motion.div>
            </div>
          ),
        },
        {
          id: "scenarios",
          label: "Scenarios",
          content: (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Scenario Tiles */}
              <motion.div className="md:col-span-2" initial={{ y: 20 }} animate={{ y: 0 }} transition={{ duration: 0.3 }}>
                <Card title="Scenario Tiles" collapsible actions={<ChartActions onExport={() => exportChart("scenarios")} onShare={() => shareChart("scenarios")} />}>
                  <Suspense fallback={<ChartFallback />}>
                    <ScenarioTiles
                      artifact={{
                        symbol: art.symbol,
                        horizon_days: art.horizon_days,
                        median_path: art.median_path,
                        bands: { p05: art.bands.p95_low, p50: art.bands.p50, p95: art.bands.p95_high },
                        prob_up_end: art.prob_up_end,
                        drivers: (art.drivers ?? []).map(d => ({ name: d.feature, weight: d.weight })),
                      }}
                      reps={scenarioReps}
                    />
                  </Suspense>
                </Card>
              </motion.div>

              {/* Top Drivers */}
              <motion.div initial={{ y: 20 }} animate={{ y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
                <Card title="Top Drivers" collapsible actions={<ChartActions onExport={() => exportChart("drivers")} onShare={() => shareChart("drivers")} />}>
                  <Suspense fallback={<ChartFallback />}>
                    <DriversWaterfall drivers={drivers.map(d => ({ name: d.feature, weight: d.weight }))} />
                  </Suspense>
                </Card>
              </motion.div>
            </div>
          ),
        },
      ]
    : [];

  // --- Render ---
  return (
    <ErrorBoundary>
      <div className={`min-h-screen ${theme === "dark" ? "bg-black text-white" : "bg-gray-100 text-gray-900"}`}>
        <Toaster />
        <main className="mx-auto max-w-[1280px] p-4">
          {/* top bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <PandaIcon />
              <h1 className="text-xl font-bold">PredictiveTwin</h1>
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded bg-[#131A23] border border-[#1B2431]"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>

          {/* onboarding */}
          {showOnboarding && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-4 rounded bg-[#131A23] border border-[#1B2431]">
              <h2 className="text-lg font-semibold">Welcome to PredictiveTwin!</h2>
              <p className="text-sm">Run simulations, analyze risks, and explore scenarios.</p>
              <button
                onClick={() => { localStorage.setItem("onboardingSeen", "true"); setShowOnboarding(false); }}
                className="mt-2 px-3 py-1 rounded bg-[#34D399] text-black text-sm"
                aria-label="Dismiss onboarding"
              >
                Got it
              </button>
            </motion.div>
          )}

          {/* layout: main column + sticky right rail */}
          <div className="flex gap-4 items-start">
            {/* LEFT: main column */}
            <section className="flex-1 min-w-0">
              <SimulationControls
                symbol={symbol}
                setSymbol={setSymbol}
                horizon={horizon}
                setHorizon={setHorizon}
                paths={paths}
                setPaths={setPaths}
                includeOptions={includeOptions}
                setIncludeOptions={setIncludeOptions}
                includeFutures={includeFutures}
                setIncludeFutures={setIncludeFutures}
                includeNews={includeNews}
                setIncludeNews={setIncludeNews}
                xHandles={xHandles}
                setXHandles={setXHandles}
                apiKey={apiKey}
                setApiKey={setApiKey}
                showApiKey={showApiKey}
                setShowApiKey={setShowApiKey}
                isTraining={isTraining}
                isPredicting={isPredicting}
                isSimulating={isSimulating}
                onPreset={handlePreset}
                onRunSimulation={runSimulation}
                onTrainModel={trainModel}
                onRunPredict={runPredict}
                onLabelNow={() => labelNow(apiKey)}
                onLearnNow={() => learnNow(apiKey, symbol)}
              />

              {/* Sticky row: Simulation Log (left) + Quick & Recent (right) */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Simulation Log (sticky) */}
                <div className="md:col-span-2 md:sticky md:top-4 self-start">
                  <Card title="Simulation Log" collapsible>
                    <div ref={logRef} className="h-40 overflow-auto text-xs text-gray-400 bg-[#131A23] p-2 rounded" aria-label="Simulation log">
                      {logMessages.map((m, i) => (<div key={i}>{m}</div>))}
                    </div>
                    <button
                      onClick={exportArtifact}
                      className="mt-2 px-3 py-1 rounded bg-[#131A23] border border-[#1B2431] text-sm"
                      disabled={!art}
                      aria-label="Export simulation artifact"
                    >
                      Export Artifact
                    </button>
                  </Card>
                </div>

                {/* Quick & Recent (sticky, same height as log) */}
                <div className="md:sticky md:top-4 self-start">
                  <Card title="Quick & Recent" collapsible>
                    {/* Quick presets */}
                    <div className="mb-3 flex flex-wrap gap-2">
                      <button onClick={() => { setSymbol("NVDA"); setHorizon(30); }} className="px-3 py-1.5 rounded bg-[#34D399] text-black text-sm hover:bg-[#2BB77F] transition">NVDA · 30d</button>
                      <button onClick={() => { setSymbol("TSLA"); setHorizon(60); }} className="px-3 py-1.5 rounded bg-[#34D399] text-black text-sm hover:bg-[#2BB77F] transition">TSLA · 60d</button>
                      <button onClick={() => { setSymbol("BTC-USD"); setHorizon(180); }} className="px-3 py-1.5 rounded bg-[#34D399] text-black text-sm hover:bg-[#2BB77F] transition">BTC · 180d</button>
                    </div>

                    {/* Recents list (auto-reads from localStorage "pp_runs") */}
                    <div className="h-40 overflow-auto divide-y divide-[#1B2431] rounded bg-[#131A23]">
                      {(() => {
                        let recent: any[] = [];
                        try { recent = JSON.parse(localStorage.getItem("pp_runs") || "[]"); } catch {}
                        if (!recent || recent.length === 0) return <div className="text-xs text-gray-400 p-2">No recent runs yet.</div>;
                        return recent.map((r, idx) => (
                          <button
                            key={r.id || r.finishedAt || idx}
                            className="w-full text-left px-3 py-2 hover:bg-[#0E141C] text-sm"
                            onClick={() => { if (r.symbol) setSymbol(r.symbol); if (r.horizon) setHorizon(r.horizon); if (r.n_paths) setPaths(r.n_paths); }}
                            title="Click to load these settings"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{r.symbol}</span>
                              <span className="text-gray-400">{r.finishedAt ? new Date(r.finishedAt).toLocaleString() : ""}</span>
                            </div>
                            <div className="text-gray-300">
                              {r.horizon ? `${r.horizon}d` : ""} {r.n_paths ? `• ${r.n_paths.toLocaleString()} paths` : ""}
                              {typeof r.probUp === "number" && <span className="ml-2 text-gray-400">· ProbUp {Math.round(r.probUp * 100)}%</span>}
                            </div>
                          </button>
                        ));
                      })()}
                    </div>
                  </Card>
                </div>
              </section>

              {/* Key metrics */}
              {art && <SummaryCard symbol={art.symbol} probUp={probUp} var95={var95} es95={es95} />}

              {/* Tabs + charts */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                <AccessibleTabs tabs={tabs} activeId={activeTab} onChange={(id) => setActiveTab(id as "risk" | "scenarios")} />
              </motion.div>

              {/* News (optional) — only once */}
              {includeNews && (
                <Card title="News" collapsible>
                  <NewsList symbol={symbol} items={newsItems} loading={newsLoading} error={newsError} nextCursor={nextCursor} onLoadMore={loadMore} />
                </Card>
              )}
            </section>

            {/* RIGHT: sticky sidebar for quick sims only */}
            <aside className="hidden lg:block w-80 shrink-0 sticky top-4 max-h-[calc(100vh-5rem)] overflow-y-auto">
              <QuickSimsPanel
                presets={QUICK_PRESETS}
                history={runHistory.map((r) => ({ symbol: r.symbol, horizon: r.horizon, paths: r.n_paths }))}
                onSelect={({ symbol, horizon, paths }) => { setSymbol(symbol); setHorizon(horizon); setPaths(paths); }}
              />
            </aside>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
