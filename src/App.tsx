import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  Filler,
  DoughnutController,
  ArcElement,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { FanChart } from "./components/FanChart";
import { Card } from "./components/ui/Card";
import { NewsList } from "./components/NewsList"
import { useNews } from "./hooks/useNews"
import {
  ScenarioTiles,
  DriversWaterfall,
  TerminalDistribution,
  HitProbabilityRibbon,
  TargetLadder,
  RegimeMap,
  CalibrationPanel,
  OptionsMiniBoard,
  FuturesCurve,
  SentimentStrip,
  ConeVsRealized,
} from "./components/PredictiveAddOns";


ChartJS.register(
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  Filler,
  DoughnutController,
  ArcElement
);

// ----------------------------
// Types
// ----------------------------
type MCArtifact = {
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

  // NEW optional fields from backend (used by add-ons)
  terminal_prices?: number[];
  var_es?: { var95: number; es95: number };
  hit_probs?: { thresholds_abs: number[]; probs_by_day: number[][] };
};

type RunSummary = {
  id: string;
  symbol: string;
  horizon: number;
  n_paths: number;
  finishedAt: string;
  q50?: number | null;
  probUp?: number | null;
};

const PandaIcon = () => (
  <svg
    className="w-8 h-8 text-[#F9F8F3]"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-4 7c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2h-8v-2z" />
  </svg>
);

export default function App() {
  // ----------------------------
  // Theme & base UI state
  // ----------------------------
  const getInitialTheme = (): "dark" | "light" => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark";
  };
  const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme);
  const [symbol, setSymbol] = useState("NVDA");
  const [horizon, setHorizon] = useState<number | "">("");
  const [paths, setPaths] = useState(2000);
  const [includeOptions, setIncludeOptions] = useState(true);
  const [includeFutures, setIncludeFutures] = useState(true);
  const [includeNews, setIncludeNews] = useState(true);
  const [xHandles, setXHandles] = useState("");
  // API key UX: keep stored key off-screen; input starts empty
  const savedApiKeyRef = useRef(localStorage.getItem("apiKey") || "");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const getApiKey = () => apiKey || savedApiKeyRef.current || "";
  const [isTraining, setIsTraining] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);

  useEffect(() => {
    if (apiKey) localStorage.setItem("apiKey", apiKey);
  }, [apiKey]);

  // ----------------------------
  // Simulation state
  // ----------------------------
  const [runId, setRunId] = useState("");
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [drivers, setDrivers] = useState<{ feature: string; weight: number }[]>(
    []
  );
  const [probUp, setProbUp] = useState(0);
  const [art, setArt] = useState<MCArtifact | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(
    !localStorage.getItem("onboardingSeen")
  );
  const logRef = useRef<HTMLDivElement | null>(null);
  const horizonNum = typeof horizon === "number" ? horizon : null;

  const [runHistory, setRunHistory] = useState<RunSummary[]>(() => {
    try {
      const saved = localStorage.getItem("pp_runs");
      return saved ? (JSON.parse(saved) as RunSummary[]) : [];
    } catch {
      return [];
    }
  });

  // Tabs state
  const [activeTab, setActiveTab] = useState("risk");

  // ----------------------------
  // Effects
  // ----------------------------
  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.className = theme === "dark" ? "dark" : "";
  }, [theme]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logMessages]);

  useEffect(() => {
    if (showOnboarding) {
      const t = setTimeout(() => {
        localStorage.setItem("onboardingSeen", "true");
        setShowOnboarding(false);
      }, 10000);
      return () => clearTimeout(t);
    }
  }, [showOnboarding]);
  const {
    items: newsItems,
    nextCursor,
    loading: newsLoading,
    error: newsError,
    loadMore,
  } = useNews({ symbol, includeNews, getApiKey, log });


  // ----------------------------
  // Helpers
  // ----------------------------
  
  function log(m: string) {
    setLogMessages((prev) => [...prev, m].slice(-50));
  }

  const lastOf = (arr: [number, number][]): number | undefined =>
    arr && arr.length ? arr[arr.length - 1][1] : undefined;
  const terminalPrices = art?.terminal_prices ?? [];
  const var95 = art?.var_es?.var95 ?? 0;
  const es95  = art?.var_es?.es95 ?? 0;
  const S0 = art?.median_path?.[0]?.[1] ?? 0;
  const Spinner = () => (
  <svg className="animate-spin h-4 w-4 text-[#9FB3C8]" viewBox="0 0 24 24">
    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
  </svg>
);
  const primaryBtn =
  "px-4 py-2 rounded-xl bg-[#1F2937] border border-[#273445] hover:bg-[#1B2431] disabled:opacity-60 disabled:cursor-not-allowed";

  const pathMatrixAbove = (tIndex: number, thresholdAbs: number) => {
    const hp = art?.hit_probs; if (!hp) return 0;
    let best = 0, bestDiff = Infinity;
    hp.thresholds_abs.forEach((thr, i) => {
      const diff = Math.abs(thr - thresholdAbs);
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    });
    return hp.probs_by_day?.[best]?.[tIndex] ?? 0;
  };

  const targetLadderData = React.useMemo(() => {
    const hp = art?.hit_probs; if (!hp) return [];
    const lastT = art?.median_path?.length ? art.median_path.length - 1 : 0;
    const labels = ["-5%", "0%", "+5%", "+10%"];
    return hp.thresholds_abs.map((thr, i) => ({
      label: labels[i] ?? `${Math.round(((thr / (S0 || 1)) - 1) * 100)}%`,
      p: hp.probs_by_day?.[i]?.[lastT] ?? 0,
    }));
  }, [art, S0]);

  const scenarioReps = art ? [
    { label: "Bear (≈p05)", path: art.bands.p95_low },
    { label: "Base (p50)",  path: art.median_path },
    { label: "Bull (≈p95)", path: art.bands.p95_high },
  ] : [];

  // Export/Share functions (placeholder: use html2canvas or similar)
  const exportChart = (chartId: string) => {
      // TODO: implement panel export (e.g., html2canvas)
    console.log(`Exporting chart: ${chartId}`);
    // Implement export logic
  };

  // --- Simple % badge for Prob Up (no charts) ---
  const probMeta = React.useMemo(() => {
    const v = Math.max(0, Math.min(1, probUp || 0));
    const pct = Math.round(v * 100);
    const color =
      v > 0.51 ? "text-[#34D399]" : v < 0.49 ? "text-[#F87171]" : "text-[#FBBF24]";
    const label = v > 0.51 ? "Bullish" : v < 0.49 ? "Bearish" : "Neutral";
    return { v, pct, color, label };
  }, [probUp]);

  const ProbBadge = () => (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#111827] border border-[#1B2431] ${probMeta.color}`}>
      <span className="font-semibold">{probMeta.pct}%</span>
      <span className="text-xs text-gray-300">{probMeta.label}</span>
    </div>
  );

  // --- simple percent formatter for VaR/ES ---
  const fmtPct = (x: number | undefined | null) =>
    (Number.isFinite(x) ? (x as number) : 0).toLocaleString(undefined, {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

  const redIfNeg = (x: number) => (x < 0 ? "text-[#F87171]" : "text-[#34D399]");

  const shareChart = (chartId: string) => {
    console.log(`Sharing chart: ${chartId}`);
    // Implement share logic
  };
  const apiHeaders = (key: string) => ({
    "Content-Type": "application/json",
    "X-API-Key": key,
  });

  // 1) Label Now (POST /outcomes/label)
  async function labelNow(apiKey: string) {
    try {
      const r = await fetch(`/outcomes/label`, {
        method: "POST",
        headers: apiHeaders(apiKey),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      toast.success(`Labeled ${data.labeled ?? 0} outcomes`);
      console.log("Label outcomes:", data);
    } catch (e: any) {
      toast.error(`Labeling failed: ${e.message || e}`);
    }
  }

  // 2) Online Learn (POST /learn/online)
  async function learnNow(apiKey: string, symbol: string) {
    try {
      const r = await fetch(`/learn/online`, {
        method: "POST",
        headers: apiHeaders(apiKey),
        body: JSON.stringify({ symbol, steps: 50, batch: 32 }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      toast.success(`Online learn OK — w[0]=${data.model?.coef?.[0]?.toFixed(3) ?? "?"}`);
      console.log("Online learn:", data);
    } catch (e: any) {
      toast.error(`Online learn failed: ${e.message || e}`);
    }
  }
  // ----------------------------
  // Actions
  // ----------------------------
  async function runSimulation() {
    const effectiveKey = getApiKey();
    if (!effectiveKey) { log("Error: Please enter a valid API key"); return; }
    if (horizonNum == null) { log("Error: Please enter a horizon (days)."); return; }
    if (horizonNum > 365) { log("Error: Horizon must be ≤ 365 days."); return; }

    setIsSimulating(true);
    setLogMessages([]);
    setArt(null);
    setProgress(0);
    setDrivers([]);
    setProbUp(0);
    setCurrentPrice(null);

    const headers = { "Content-Type": "application/json", "X-API-Key": effectiveKey };

    try {
      // 1) Kick off the simulation
      const payload: any = {
        symbol: symbol.toUpperCase(),
        horizon_days: Number(horizonNum),
        n_paths: Number(paths),
        timespan: "day",
        include_news: !!includeNews,
        include_options: !!includeOptions,
        include_futures: !!includeFutures,
      };
      if (xHandles.trim()) payload.x_handles = xHandles.trim(); // comma-separated string

      const resp = await fetch("/simulate", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`HTTP ${resp.status} – ${errText}`);
      }

      const { run_id } = await resp.json();
      setRunId(run_id);
      log(`Queued run_id: ${run_id}`);

      // 2) Stream progress
      await fetchEventSource(`/simulate/${run_id}/stream`, {
        headers,
        onopen: async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          log("Connected to stream");
        },
        onmessage: (ev) => {
          try {
            const d = JSON.parse(ev.data);
            if (typeof d.status === "string") {
              const p = typeof d.progress === "number" ? d.progress : 0;
              setProgress(p);
              log(`Status: ${d.status} | Progress: ${Math.round(p)}%`);
            }
          } catch {
            // ignore one-off parse blips
          }
        },
        onerror: (err) => { throw err; },
        onclose: () => log("Stream closed."),
      });

      // 3) Fetch artifact
      const a = await fetch(`/simulate/${run_id}/artifact`, { headers });
      if (!a.ok) {
        const errText = await a.text();
        throw new Error(`Artifact fetch failed: ${a.status} – ${errText}`);
      }
      const artf: MCArtifact = await a.json();

      setArt(artf);
      setDrivers(artf.drivers || []);
      setProbUp(artf.prob_up_end || 0);
      setCurrentPrice(
        (artf as any).spot ??
        artf.median_path?.[0]?.[1] ??
        null
      );
      // Save a short summary to history
      setRunHistory((prev) => {
        const updated = [{
          id: run_id,
          symbol,
          horizon: horizonNum ?? 0,
          n_paths: paths,
          finishedAt: new Date().toISOString(),
          q50: artf.bands.p50?.[artf.bands.p50.length - 1]?.[1] ?? null,
          probUp: artf.prob_up_end ?? null,
        }, ...prev].slice(0, 20);
        try { localStorage.setItem("pp_runs", JSON.stringify(updated)); } catch {}
        return updated;
      });

    } catch (e: any) {
      log(`Error: ${e.message ?? e}`);
    } finally {
      setIsSimulating(false);
    }
  }
  async function trainModel() {
    const effectiveKey = getApiKey();
    if (!effectiveKey) { log("Error: Please enter a valid API key"); return; }
    setIsTraining(true);
    log("Training model...");
    try {
      const headers = { "Content-Type": "application/json", "X-API-Key": effectiveKey };
      const resp = await fetch("/train", {
        method: "POST",
        headers,
        body: JSON.stringify({ symbol, lookback_days: 180 }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Train failed: ${resp.status} – ${txt}`);
      }
      log("Model trained successfully.");
    } catch (e: any) {
      log(`Error: ${e.message ?? e}`);
    } finally {
      setIsTraining(false);
    }
  }

  async function runPredict() {
    const effectiveKey = getApiKey();
    if (!effectiveKey) { log("Error: Please enter a valid API key"); return; }
    setIsPredicting(true);
    log("Running prediction...");
    try {
      const headers = { "Content-Type": "application/json", "X-API-Key": effectiveKey };
      const h = typeof horizon === "number" ? horizon : 30;
      const resp = await fetch("/predict", {
        method: "POST",
        headers,
        body: JSON.stringify({ symbol, horizon_days: h }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Predict failed: ${resp.status} – ${txt}`);
      }
      const js = await resp.json();
      log(`Prediction: Prob Up Next = ${(js.prob_up_next * 100).toFixed(2)}%`);
    } catch (e: any) {
      log(`Error: ${e.message ?? e}`);
    } finally {
      setIsPredicting(false);
    }
  }

  function exportArtifact() {
    if (!art) return;
    const blob = new Blob([JSON.stringify(art, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mc_${art.symbol}_${art.horizon_days}d.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ----------------------------
  // Renders
  // ----------------------------
  return (
    <div className="min-h-screen bg-[#0A0F17] text-[#F9F8F3] font-sans">
      <Toaster position="bottom-right" />

      <main className="max-w-6xl mx-auto p-6">
        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs text-gray-400">Symbol</label>
            <input
              className="w-full mt-1 px-3 py-2 rounded-xl bg-[#131A23] border border-[#1B2431] outline-none"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="NVDA"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Horizon (days)</label>
            <input
              type="number"
              className="w-full mt-1 px-3 py-2 rounded-xl bg-[#131A23] border border-[#1B2431] outline-none"
              value={horizon}
              onChange={(e) => setHorizon(e.target.valueAsNumber || "")}
              placeholder="30"
              min={1}
              max={365}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Paths</label>
            <input
              type="number"
              className="w-full mt-1 px-3 py-2 rounded-xl bg-[#131A23] border border-[#1B2431] outline-none"
              value={paths}
              onChange={(e) => setPaths(e.target.valueAsNumber)}
              min={100}
              step={100}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">API Key</label>
            <div className="relative mt-1">
              <input
                type={showApiKey ? "text" : "password"}
                className="w-full px-3 py-2 rounded-xl bg-[#131A23] border border-[#1B2431] outline-none"
                value={apiKey || savedApiKeyRef.current}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
              <button
                onClick={() => setShowApiKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400"
              >
                {showApiKey ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        </div>

        {/* Toggles & Advanced */}
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeOptions}
              onChange={(e) => setIncludeOptions(e.target.checked)}
            />
            Include Options
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeFutures}
              onChange={(e) => setIncludeFutures(e.target.checked)}
            />
            Include Futures
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeNews}
              onChange={(e) => setIncludeNews(e.target.checked)}
            />
            Include News
          </label>
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="ml-auto px-3 py-2 rounded-xl bg-[#131A23] border border-[#1B2431]"
          >
            {showAdvanced ? "Hide Advanced" : "Advanced"}
          </button>
        </div>

        {/* Advanced */}
        {showAdvanced && (
          <div className="mb-4">
            <label className="text-xs text-gray-400">X handles (comma-sep)</label>
            <input
              className="w-full mt-1 px-3 py-2 rounded-xl bg-[#131A23] border border-[#1B2431] outline-none"
              value={xHandles}
              onChange={(e) => setXHandles(e.target.value)}
              placeholder="@elonmusk,@business"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            onClick={runSimulation}
            disabled={isSimulating || !symbol || !horizonNum || !paths}
            className={primaryBtn}
          >
            {isSimulating ? (
              <span className="inline-flex items-center gap-2"><Spinner /> Running…</span>
            ) : (
              "Run Simulation"
            )}
          </button>

          <button
            onClick={trainModel}
            disabled={isTraining}
            className={primaryBtn}
            aria-busy={isTraining}
          >
            {isTraining ? (
              <span className="inline-flex items-center gap-2"><Spinner /> Training…</span>
            ) : (
              "Train"
            )}
          </button>

          <button
            onClick={runPredict}
            disabled={isPredicting}
            className={primaryBtn}
            aria-busy={isPredicting}
          >
            {isPredicting ? (
              <span className="inline-flex items-center gap-2"><Spinner /> Predicting…</span>
            ) : (
              "Predict"
            )}
          </button>

          <button
            onClick={exportArtifact}
            disabled={!art}
            className="px-4 py-2 rounded-xl bg-[#131A23] border border-[#1B2431] disabled:opacity-60"
          >
            Export Artifact
          </button>

          <div className="ml-auto"><ProbBadge /></div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            className="px-3 py-2 rounded bg-emerald-600 text-white disabled:opacity-60"
            onClick={() => labelNow(apiKey)}
            disabled={!apiKey}
          >
            Label Outcomes (Now)
          </button>
          <button
            className="px-3 py-2 rounded bg-indigo-600 text-white disabled:opacity-60"
            onClick={() => learnNow(apiKey, symbol)}
            disabled={!apiKey}
          >
            Online Learn
          </button>
        </div>

        {/* Log */}
        <div
          ref={logRef}
          className="text-xs bg-[#0E141C] border border-[#1B2431] rounded-xl p-3 h-28 overflow-auto mb-6"
        >
          {logMessages.map((m, i) => (
            <div key={i} className="text-gray-300">
              {m}
            </div>
          ))}
        </div>

        {/* --- News (optional) -------------------------------------------------- */}
        {includeNews && (
          <NewsList
            symbol={symbol}
            items={newsItems}
            loading={newsLoading}
            error={newsError}
            nextCursor={nextCursor}
            onLoadMore={loadMore}
          />
        )}
        {/* Sticky Decision Bar (text-only, no charts) */}
        {art && (
          <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-[#0A0F17]/70 backdrop-blur border-b border-[#121923] mb-6">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card title="Probability Up">
                <div className="min-h-[72px] flex items-center">
                  <ProbBadge />
                </div>
              </Card>

              <Card title="Risk">
                <div className="min-h-[72px] text-sm leading-6">
                  <div>
                    <span className="text-gray-400">VaR 95%:</span>{" "}
                    <span className={redIfNeg(var95)}>{fmtPct(var95)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">ES 95%:</span>{" "}
                    <span className={redIfNeg(es95)}>{fmtPct(es95)}</span>
                  </div>
                </div>
              </Card>

              <Card title="Horizon Odds">
                <div className="min-h-[72px]">
                  {targetLadderData.length ? (
                    <TargetLadder probs={targetLadderData} />
                  ) : (
                    <div className="text-xs text-gray-400">
                      Run a simulation to see horizon odds.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Fan Chart */}
        {art && (
          <div className="mb-6">
            <Card title="Fan Chart">
              <FanChart
                data={{
                  symbol: art.symbol,
                  median_path: art.median_path,
                  bands: {
                    p50: art.bands.p50,
                    p80_low: art.bands.p80_low,
                    p80_high: art.bands.p80_high,
                    p95_low: art.bands.p95_low,
                    p95_high: art.bands.p95_high,
                  },
                  prob_up_end: art.prob_up_end,
                  horizon_days: art.horizon_days,
                }}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => exportChart("fan")}
                  className="px-2 py-1 rounded bg-[#131A23] border border-[#1B2431]"
                >
                  Export
                </button>
                <button
                  onClick={() => shareChart("fan")}
                  className="px-2 py-1 rounded bg-[#131A23] border border-[#1B2431]"
                >
                  Share
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* Tabs for Risk / Scenarios */}
        {art && (
          <div className="mb-6">
            <div className="flex border-b border-[#1B2431] rounded-t-2xl overflow-hidden">
              <button
                className={`px-4 py-2 ${activeTab === "risk" ? "bg-[#1F2937]" : "bg-[#131A23]"}`}
                onClick={() => setActiveTab("risk")}
              >
                Risk & Evidence
              </button>
              <button
                className={`px-4 py-2 ${activeTab === "scenarios" ? "bg-[#1F2937]" : "bg-[#131A23]"}`}
                onClick={() => setActiveTab("scenarios")}
              >
                Scenarios & Drivers
              </button>
            </div>

            <div className="p-4 bg-[#0E141C] rounded-b-2xl border border-[#1B2431] border-t-0">
              {activeTab === "risk" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Hit Probability Ribbon */}
                  <div className="md:col-span-2">
                    <Card title="Hit Probability Ribbon">
                      <HitProbabilityRibbon
                        artifact={{
                          symbol: art.symbol,
                          horizon_days: art.horizon_days,
                          median_path: art.median_path,
                          bands: {
                            p05: art.bands.p95_low,
                            p50: art.bands.p50,
                            p95: art.bands.p95_high,
                          },
                          prob_up_end: art.prob_up_end,
                          drivers:
                            art.drivers?.map((d) => ({
                              name: d.feature,
                              weight: d.weight,
                            })) ?? [],
                        }}
                        thresholds={[-0.05, 0, 0.05, 0.1]}
                        S0={S0}
                        pathMatrixAbove={pathMatrixAbove}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => exportChart("hit")}
                          className="px-2 py-1 rounded bg-[#131A23] border border-[#1B2431]"
                        >
                          Export
                        </button>
                        <button
                          onClick={() => shareChart("hit")}
                          className="px-2 py-1 rounded bg-[#131A23] border border-[#1B2431]"
                        >
                          Share
                        </button>
                      </div>
                    </Card>
                  </div>

                  {/* Terminal Distribution */}
                  <div className="md:col-span-1">
                    <Card title="Terminal Distribution">
                      <TerminalDistribution
                        pathsTerminal={terminalPrices}
                        ptiles={{
                          p05: lastOf(art.bands.p95_low),
                          p50: lastOf(art.bands.p50),
                          p95: lastOf(art.bands.p95_high),
                        }}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => exportChart("terminal")}
                          className="px-2 py-1 rounded bg-[#131A23] border border-[#1B2431]"
                        >
                          Export
                        </button>
                        <button
                          onClick={() => shareChart("terminal")}
                          className="px-2 py-1 rounded bg-[#131A23] border border-[#1B2431]"
                        >
                          Share
                        </button>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === "scenarios" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Scenario Tiles */}
                  <div className="md:col-span-2">
                    <Card title="Scenario Tiles">
                      <ScenarioTiles
                        artifact={{
                          symbol: art.symbol,
                          horizon_days: art.horizon_days,
                          median_path: art.median_path,
                          bands: {
                            p05: art.bands.p95_low,
                            p50: art.bands.p50,
                            p95: art.bands.p95_high,
                          },
                          prob_up_end: art.prob_up_end,
                          drivers:
                            art.drivers?.map((d) => ({
                              name: d.feature,
                              weight: d.weight,
                            })) ?? [],
                        }}
                        reps={scenarioReps}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => exportChart("scenarios")}
                          className="px-2 py-1 rounded bg-[#131A23] border border-[#1B2431]"
                        >
                          Export
                        </button>
                        <button
                          onClick={() => shareChart("scenarios")}
                          className="px-2 py-1 rounded bg-[#131A23] border border-[#1B2431]"
                        >
                          Share
                        </button>
                      </div>
                    </Card>
                  </div>

                  {/* Drivers Waterfall */}
                  <div className="md:col-span-1">
                    <Card title="Drivers">
                      <DriversWaterfall
                        drivers={drivers.map((d) => ({
                          name: d.feature,
                          weight: d.weight,
                        }))}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => exportChart("drivers")}
                          className="px-2 py-1 rounded bg-[#131A23] border border-[#1B2431]"
                        >
                          Export
                        </button>
                        <button
                          onClick={() => shareChart("drivers")}
                          className="px-2 py-1 rounded bg-[#131A23] border border-[#1B2431]"
                        >
                          Share
                        </button>
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}