import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from "react";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import html2canvas from "html2canvas";
import "chart.js/auto";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import DailyQuantCard from "./components/DailyQuantCard";
import { throttle } from "./utils/throttle";
import { encodeState } from "./utils/stateShare";

import NewsList from "./components/NewsList";
import { useNews } from "@/hooks/useNews";
import { InlineLegend } from "./components/InlineLegend";
import { ChartActions } from "./components/ChartActions";
import { SummaryCard } from "./components/SummaryCard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import RightRail from "./components/RightRail";
import { TrackRecordPanel } from "./components/TrackRecordPanel";
import { EmptyState } from "@/components/EmptyState";
import { CardMenu } from "@/components/ui/CardMenu";
import LogoSimetrix from "@/components/branding/LogoSimetrix";
import LoadingButton from "./components/ui/LoadingButton";
import RecentRunsRail from "./components/RecentRunsRail";
import { Card as UICard } from "@/components/ui/Card"; 
import SimSummaryCard from "./components/SimSummaryCard";
import TargetsAndOdds from "./TargetsAndOdds";
import ListCard from "./ListCard";
import SimButton from "@/components/ui/SimButton";
import { applyChartTheme } from "@/theme/chartTheme";


// Lazy chunked charts/add-ons
const FanChart = React.lazy(() => import("./components/FanChart"));
const HitProbabilityRibbon = React.lazy(() =>
  import("./components/PredictiveAddOns").then((m) => ({ default: m.HitProbabilityRibbon }))
);
const TerminalDistribution = React.lazy(() =>
  () => import("./components/TerminalDistribution")
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
type SimMode = "quick" | "deep";
const EB: React.FC<React.PropsWithChildren> = ({ children }) => (
  <ErrorBoundary>{children}</ErrorBoundary>
);

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
  targets?: {
    spot: number;
    horizon_days: number;
    levels: Array<{ label: string; price: number; hitEver?: number; hitByEnd?: number; tMedDays?: number }>;
  };
  prob_up_next?: number;
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
// ---- API base (single source of truth) ----
declare global {
  interface Window {
    __PP_API_BASE__?: string;
  }
}

const API_BASE = String(
  (typeof window !== "undefined" && window.__PP_API_BASE__) ||
  (import.meta as any)?.env?.VITE_PT_API_BASE ||
  ""
).replace(/\/+$/, "");

const api = (p: string) => `${API_BASE}${p.startsWith("/") ? "" : "/"}${p}`;

// const res = await fetch(api("/quant/daily/today"), { cache: "no-store" });
// const data = await res.json();

// Text-first helpers so we can detect HTML 404s and show useful errors
async function safeText(r: Response) {
  try { return await r.text(); } catch { return "<no body>"; }
}
function looksLikeHTML(s: string) {
  return /^\s*<!doctype html>|<html/i.test(s);
}

// Resolve a usable app key from env/window only (no user input/localStorage)
const resolvedPtKey = (): string => (DEFAULT_PT_KEY || "").trim();

// Canonical headers builder (uses env/window app key)
const apiHeaders = () => ({
  Accept: "application/json",
  "Content-Type": "application/json",
  "X-API-Key": resolvedPtKey(), // Backend maps this to server-side secrets
});
// TEMP Card shim so the app runs; replace with your real Card later
const Card: React.FC<{
  title?: string;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}> = ({ title, actions, className = "", children }) => (
  <section className={`rounded-xl border border-[#23262b] bg-[#0f1216]/60 ${className}`}>
    {(title || actions) && (
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#23262b]">
        <div className="text-sm font-semibold">{title}</div>
        {actions}
      </div>
    )}
    <div className="p-4">{children}</div>
  </section>
);
const isAdmin =
  typeof window !== "undefined" && localStorage.getItem("simetrix:isAdmin") === "1";

const OnlyAdmin: React.FC<React.PropsWithChildren> = ({ children }) =>
  isAdmin ? <>{children}</> : null;

const OnlyLegacy: React.FC<React.PropsWithChildren> = ({ children }) => null; 
export default function App() {
  // ——— helpers (local) ———
  const getInitialTheme = (): "dark" | "light" => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme") || "dark" : "dark";
    return saved === "light" || saved === "dark" ? saved : "dark";
  };
  const LOG_HEIGHT = "h-40";
  // Robust horizon coercion: never let '' become 0
  const coerceDays = (h: number | '' | string): number => {
    if (typeof h === "number") return Number.isFinite(h) ? h : NaN;
    if (h === "") return NaN;
    const n = Number.parseInt(String(h), 10);
    return Number.isFinite(n) ? n : NaN;
  };

  // ——— state ———
  const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme);
  const [symbol, setSymbol] = useState("NVDA");
  const [horizon, setHorizon] = useState<number | ''>('');
  const [paths, setPaths] = useState(2000);

  const [includeOptions, setIncludeOptions] = useState(true);
  const [includeFutures, setIncludeFutures] = useState(true);
  const [includeNews, setIncludeNews] = useState(false);
  const [xHandles, setXHandles] = useState("");

  const [isTraining, setIsTraining] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [drivers, setDrivers] = useState<{ feature: string; weight: number }[]>([]);
  const [probUp, setProbUp] = useState(0);
  const [probUpNext, setProbUpNext] = useState<number | null>(null); // next-bar
  const [art, setArt] = useState<MCArtifact | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [runId, setRunId] = React.useState<string | null>(null);

  const [showOnboarding, setShowOnboarding] = useState(
    typeof window !== "undefined" ? !localStorage.getItem("onboardingSeen") : false
  );
  const [activeTab] = useState<"risk" | "scenarios" | "track">("risk"); // kept for future wiring

  const [runHistory, setRunHistory] = useState<RunSummary[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("pp_runs");
      return saved ? (JSON.parse(saved) as RunSummary[]) : [];
    } catch {
      return [];
    }
  });
  // Derived validity flags for cleaner button disabling
  const isHorizonValid = useMemo(() => {
    const h = typeof horizon === "number" ? horizon : NaN;
    return Number.isFinite(h) && h >= 1 && h <= 3650;
  }, [horizon]);

  const isPredictHorizonValid = useMemo(() => {
    const h = typeof horizon === "number" ? horizon : NaN;
    return Number.isFinite(h) && h >= 1 && h <= 365; // Predict capped at 365
  }, [horizon]);

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

  const runsForTrackRecord = useMemo(
    () =>
      (Array.isArray(runHistory) ? runHistory : []).map((r: any) => ({
        ...r,
        q50: (typeof r?.q50 === "number" && Number.isFinite(r.q50)) ? r.q50 : undefined,
        probUp: (typeof r?.probUp === "number" && Number.isFinite(r.probUp)) ? r.probUp : undefined,
      })),
    [runHistory]
  );
  // Admin-only UI gate: toggle with ?admin=1 (enable) or ?admin=0 (disable)
  const [isAdminUI, setIsAdminUI] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("admin") === "1") localStorage.setItem("pp_admin", "1");
      if (url.searchParams.get("admin") === "0") localStorage.removeItem("pp_admin");
      setIsAdminUI(localStorage.getItem("pp_admin") === "1");
    } catch {}
  }, []);

  const recentItems = useMemo(() => {
    const list = runsForTrackRecord;
    return list.slice(-8).reverse().map((r) => ({
      title: `${r.symbol} • H${r.horizon}d`,
      subtitle: `${r.n_paths?.toLocaleString?.() ?? r.n_paths} paths — ${new Date(r.finishedAt).toLocaleString()}`,
      onClick: () => {
        setSymbol(r.symbol);
        setHorizon(r.horizon);
        setPaths(r.n_paths);
        throttledLog?.(`Loaded recent: ${r.symbol} • ${r.horizon}d • ${r.n_paths} paths`);
      },
    }));
  }, [runsForTrackRecord, throttledLog]);
  useEffect(() => { applyChartTheme(); }, []);
  const logRef = useRef<HTMLDivElement | null>(null);
  const sseAbortRef = useRef<AbortController | null>(null);
  // Lock theme to dark (no light mode)
  useEffect(() => {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
    try { localStorage.setItem("theme", "dark"); } catch {}
  }, []);

  useEffect(() => {
    console.info("[Simetrix] API_BASE =", API_BASE || "(empty; using relative URLs)");
  }, []);

  // Persist theme and apply to <html>
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
      document.documentElement.className = theme;
    }
  }, [theme]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logMessages]);

  // One-time onboarding auto-dismiss
  useEffect(() => {
    if (!showOnboarding) return;
    const t = setTimeout(() => {
      if (typeof window !== "undefined") localStorage.setItem("onboardingSeen", "true");
      setShowOnboarding(false);
    }, 10000);
    return () => clearTimeout(t);
  }, [showOnboarding]);

  // Memo headers (stable)
  const getAuthHeaders = useCallback(() => apiHeaders(), []);  // ---- News (single source of truth)
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
    apiBase: API_BASE,
    getHeaders: getAuthHeaders,
    onLog: throttledLog,
  });
  const newsItems = useMemo(() => (Array.isArray(newsItemsRaw) ? newsItemsRaw : []), [newsItemsRaw]);

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

  const eod = art?.eod_estimate ?? null;

  // —— Actions (guarded) ——
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
        const stamp = new Date().toISOString().slice(0, 10);
        link.download = `${symbol}_H${coerceDays(horizon) || "?"}_${chartId}_${stamp}.png`;
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
          csvLink.download = `${symbol}_H${coerceDays(horizon) || "?"}_${chartId}.csv`;
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
    const state = encodeState({ symbol, horizon, paths, chartId, mode: (art as any)?.plan_used || "deep" });
    const url = `${window.location.origin}/share?state=${state}`;
    navigator.clipboard.writeText(url);
    toast.success("Shareable link copied.");
  };
  React.useEffect(() => {
  // Establish an anonymous session cookie (Option A)
  fetch(api("/session/anon"), { method: "POST", credentials: "include" })
    .catch(() => {/* ignore */});
}, []);

  // ---- Backend calls ----
  async function labelNowAction() {
    try {
      const url = api("/outcomes/label");
      const r = await fetch(url, { 
        method: "POST",
        credentials: "include",  
        headers: getAuthHeaders() });
      const text = await safeText(r);
      if (!r.ok) {
        if (looksLikeHTML(text)) throw new Error("Misrouted to HTML. Check API base.");
        throw new Error(`HTTP ${r.status} – ${text}`);
      }
      const data = JSON.parse(text);
      toast.success(`Labeled ${data.labeled ?? 0} outcomes`);
    } catch (e: any) {
      toast.error(`Labeling failed: ${e.message || e}`);
    }
  }

  async function learnNowAction() {
    try {
      const url = api("/learn/online");
      const r = await fetch(url, {
        method: "POST",
        credentials: "include", 
        headers: getAuthHeaders(),
        body: JSON.stringify({ symbol: symbol.toUpperCase(), steps: 50, batch: 32 }),
      });
      const text = await safeText(r);
      if (!r.ok) {
        if (looksLikeHTML(text)) throw new Error("Misrouted to HTML. Check API base.");
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
    throttledLog("Training model...");
    try {
      const url = api("/train");
      const resp = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ symbol: symbol.toUpperCase(), lookback_days: 3650 }),
      });
      const text = await safeText(resp);
      if (!resp.ok) {
        if (looksLikeHTML(text)) throw new Error("Misrouted to HTML. Check API base.");
        throw new Error(`Train failed: ${resp.status} – ${text}`);
      }
      throttledLog("Model trained successfully.");
    } catch (e: any) {
      throttledLog(`Error: ${e.message || e}`);
    }
  }
  async function runPredict() {
    const h = coerceDays(horizon);
    if (!Number.isFinite(h) || h < 1) {
      throttledLog("Error: Please enter a horizon (days).");
      return;
    }
    if (h > 365) {
      throttledLog("Error: Predict horizon must be ≤ 365 days.");
      return;
    }
    throttledLog(`Running prediction… [${symbol.toUpperCase()} H${h}]`);
    try {
      const url = api("/predict");
      const resp = await fetch(url, {
        method: "POST",
        credentials: "include",   
        headers: getAuthHeaders(),
        body: JSON.stringify({ symbol: symbol.toUpperCase(), horizon_days: h }),
      });
      const text = await safeText(resp);
      if (!resp.ok) {
        if (looksLikeHTML(text)) throw new Error("Misrouted to HTML. Check API base.");
        throw new Error(`Predict failed: ${resp.status} – ${text}`);
      }
      const js = JSON.parse(text);
      const pu = Number(js?.prob_up_next);
      if (Number.isFinite(pu)) setProbUpNext(pu);
      throttledLog(`Prediction: Prob Up Next = ${Number.isFinite(pu) ? (pu * 100).toFixed(2) : "?"}%`);
    } catch (e: any) {
      throttledLog(`Error: ${e.message || e}`);
    }
  }

  async function runSimulation(mode: SimMode) {
    const hNum = coerceDays(horizon);
    if (!Number.isFinite(hNum) || hNum < 1) {
      throttledLog("Error: Please enter a horizon (days).");
      return;
    }
    if (hNum > 3650) {
      throttledLog("Error: Horizon must be ≤ 3650 days. (10 years)");
      return;
    }

    // clamp paths client-side; server still enforces limits
    const pNum = Math.max(100, Math.min(Number(paths) || 2000, 10000));

    setIsSimulating(true);
    setLogMessages([]);
    setArt(null);
    setProgress(0);
    setDrivers([]);
    setProbUp(0);
    setCurrentPrice(null);
    setRunId(null);
    setProbUpNext(null);   

    try {
      const payload: any = {
        mode, // <-- "quick" or "deep"
        symbol: symbol.toUpperCase(),
        horizon_days: Number(hNum),
        n_paths: Number(pNum),
        timespan: "day",
        include_news: !!includeNews,
        include_options: !!includeOptions,
        include_futures: !!includeFutures,
        ...(xHandles.trim() ? { x_handles: xHandles.trim() } : {}),
      };

      // Kick off
      const startUrl = api("/simulate");
      const resp = await fetch(startUrl, {
        method: "POST",
        credentials: "include",   
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const startTxt = await safeText(resp);
      if (!resp.ok) {
        if (looksLikeHTML(startTxt)) throw new Error("Misrouted to HTML. Check API base.");
        throw new Error(`HTTP ${resp.status} – ${startTxt}`);
      }
      const { run_id } = JSON.parse(startTxt);
      setRunId(run_id);
      throttledLog(`Queued run_id: ${run_id} [${mode.toUpperCase()}]`);

      // Stream progress (SSE) — cancel any previous
      try { sseAbortRef.current?.abort(); } catch {}
      sseAbortRef.current = new AbortController();

      let streamOpened = false;

      try {
        const streamUrl = api(`/simulate/${run_id}/stream`);
        await fetchEventSource(streamUrl, {
          headers: getAuthHeaders(),
          signal: sseAbortRef.current.signal,
          openWhenHidden: true,
          // If your version supports it, set retry=0 to avoid reconnects
          // @ts-ignore
          retry: 0,
          onopen: async (r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            streamOpened = true;
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
            } catch {}
          },
          onerror: (err) => {
            throttledLog(`Stream error: ${err?.message || err}. Ending stream and continuing…`);
            try { sseAbortRef.current?.abort(); } catch {}
            // Do NOT throw; let the promise resolve so we can move on to artifact
          },
          onclose: () => throttledLog("Stream closed."),
        });
      } catch (e: any) {
        throttledLog(`Stream failed to start: ${e?.message || e}. Continuing…`);
      } finally {
        try { sseAbortRef.current?.abort(); } catch {}
        sseAbortRef.current = null;
      }
      // Fetch artifact
      const artUrl = api(`/simulate/${run_id}/artifact`);
      const a = await fetch(artUrl, { headers: getAuthHeaders() });
      const artTxt = await safeText(a);
      if (!a.ok) {
        if (looksLikeHTML(artTxt)) throw new Error("Misrouted to HTML. Check API base.");
        throw new Error(`Artifact fetch failed: ${a.status} – ${artTxt}`);
      }
      const artf: MCArtifact = JSON.parse(artTxt);
      setArt(artf);
      setDrivers(artf.drivers || []);
      setProbUp(artf.prob_up_end || 0);
      setCurrentPrice((artf as any).spot ?? artf.median_path?.[0]?.[1] ?? null);
      const puFromArtifact = Number((artf as any)?.prob_up_next);
      if (Number.isFinite(puFromArtifact)) {
        setProbUpNext(puFromArtifact);
        throttledLog(`Next-bar P(up) from artifact: ${(puFromArtifact * 100).toFixed(2)}%`);
      } else {
        // Fallback: make a quick /predict call to populate prob_up_next
        try {
          const r = await fetch(api("/predict"), {
            method: "POST",
            credentials: "include",
            headers: getAuthHeaders(),
            body: JSON.stringify({ symbol: symbol.toUpperCase(), horizon_days: Math.min(hNum, 365) }),
          });
          const t = await safeText(r);
          if (r.ok) {
            const js = JSON.parse(t);
            const pu = Number(js?.prob_up_next);
            if (Number.isFinite(pu)) {
              setProbUpNext(pu);
              throttledLog(`Next-bar P(up): ${(pu * 100).toFixed(2)}%`);
            }
          }
        } catch { /* non-fatal */ }
      }
      // 🔥 Warm the LLM summary cache (non-blocking)
      try {
        // If your /runs/{id}/summary is public:
        if (artf && run_id) {
          fetch(api(`/runs/${run_id}/summary`)).catch(() => {});
        }
        // If you protected it, use:
        //fetch(api(`/runs/${run_id}/summary`), { headers: getAuthHeaders() }).catch(() => {});
      } catch {}
      const warns = (artf as any)?.warnings;
      if (Array.isArray(warns) && warns.length) {
        warns.forEach((w: string) => toast((w || "").trim(), { icon: "⚠️" }));
      }
      // 👉 Log “most likely” (mode) at the selected horizon with +/-% coloring
      try {
        const s0 =
          (artf as any)?.spot ??
          (artf as any)?.inputs?.S0 ??
          (Array.isArray(artf?.median_path) ? artf.median_path?.[0]?.[1] : null);

        const ml = (artf as any)?.most_likely_price;
        if (Number.isFinite(s0) && Number.isFinite(ml)) {
          const pct = ((ml as number) / (s0 as number) - 1) * 100;
          const tag = pct >= 0 ? "[UP]" : "[DOWN]";
          throttledLog(
            `${tag} Most likely (mode) at H${hNum}d: $${Number(ml).toFixed(2)} (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)`
          );
        }
        // Optional: also surface a compact HDI
        const hdi = (artf as any)?.hdi10;
        if (hdi && Number.isFinite(hdi.low) && Number.isFinite(hdi.high)) {
          throttledLog(
            `10% HDI around mode: $${Number(hdi.low).toFixed(2)} – $${Number(hdi.high).toFixed(2)}`
          );
        }
      } catch {}
      // Save to recent runs
      setRunHistory((prev) => {
        const updated = [
          {
            id: run_id,
            symbol,
            horizon: hNum ?? 0,
            n_paths: pNum,
            finishedAt: new Date().toISOString(),
            q50: artf.bands?.p50?.[artf.bands.p50.length - 1]?.[1] ?? null,
            probUp: artf.prob_up_end ?? null,
            mode,
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
  // —— Derived: most-likely (mode) + 10% HDI for KPI strip ——
  const s0FromArt =
    (art as any)?.spot ??
    (art as any)?.inputs?.S0 ??
    (Array.isArray(art?.median_path) ? art?.median_path?.[0]?.[1] : null);

  const modePrice =
    (art as any)?.most_likely_price &&
    Number.isFinite((art as any).most_likely_price)
      ? Number((art as any).most_likely_price)
      : null;

  const modePct =
    Number.isFinite(s0FromArt) && Number.isFinite(modePrice)
      ? ((modePrice as number) / (s0FromArt as number) - 1) * 100
      : null;

  const modeColor =
    typeof modePct === "number"
      ? modePct >= 0
        ? "text-emerald-400"
        : "text-rose-400"
      : "opacity-80";

  const hdi10 = (art as any)?.hdi10;
  const hdiLow =
    hdi10 && Number.isFinite(hdi10.low) ? Number(hdi10.low) : null;
  const hdiHigh =
    hdi10 && Number.isFinite(hdi10.high) ? Number(hdi10.high) : null;


  const recentRuns = (Array.isArray(runsForTrackRecord) ? runsForTrackRecord : [])
    .slice(-8)
    .reverse()
    .map((r) => ({
      title: `${r.symbol} • H${r.horizon}d`,
      subtitle: `${(r.n_paths ?? 0).toLocaleString?.() ?? String(r.n_paths)} paths — ${
        r.finishedAt ? new Date(r.finishedAt).toLocaleString() : "just now"
      }`,
      onClick: () => {
        setSymbol(r.symbol);
        setHorizon(r.horizon);
        setPaths(r.n_paths);
        throttledLog?.(`Loaded recent: ${r.symbol} • ${r.horizon}d • ${r.n_paths} paths`);
      },
    }));
const rows = art?.targets?.levels ?? [];
const targetsRows = React.useMemo(() => {
  if (!art || !currentPrice) return [];

  // Example mapping — replace with real barrier stats from backend:
  const rung = (p: number, lbl: string) => ({
    label: lbl, price: p, hitEver: undefined, hitByEnd: undefined, tMedDays: undefined
  });

  return [
    rung(currentPrice * 0.8, "-20%"),
    rung(currentPrice * 0.9, "-10%"),
    { label: "Spot", price: currentPrice, hitEver: undefined, hitByEnd: undefined, tMedDays: undefined },
    rung(currentPrice * 1.1, "+10%"),
    rung(currentPrice * 1.2, "+20%"),
    rung(currentPrice * 1.3, "+30%"),
  ];
}, [art, currentPrice]);


  // ——— render ———
  return (
    <main className="min-h-screen bg-[#0b0b0d] text-[#F9F8F3]">
      <Toaster position="bottom-right" />
      <EB>
        {/* Header */}
        <div className="px-4 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoSimetrix
              size={28}
              tone={theme === "dark" ? "light" : "dark"}
              lockup="horizontal"    // "icon" | "horizontal" | "stacked"
              animated={false}       // flip to true if you want subtle bar “breathing”
            />
            <h1 className="text-xl font-semibold">SIMETRIX</h1>
          </div>
        </div> 
        {/* Daily Quant + KPI strip (inline on md+) */}
        <section className="mx-4 mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
          {/* Left: Daily Quant picks (spans 2 cols on md+) */}
          <Card className="md:col-span-2">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm opacity-70">Daily Quant Picks</div>
                {/* optional: refresh control later */}
              </div>
              <div className="mt-2">
                <DailyQuantCard
                  apiBase={API_BASE}
                  getHeaders={getAuthHeaders}
                  onOpen={(sym, h) => {
                    setSymbol(sym);
                    setHorizon(h || 30);
                  }}
                />
              </div>

              <div className="mt-2 text-[10px] leading-4 opacity-60">
                For research/educational use.
              </div>
            </div>
          </Card>
          {/* Right: KPI strip */}
          <Card>
            <div className="p-4 grid grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-3 text-sm">
              {/* Current */}
              <div>
                <div className="opacity-60">Current</div>
                <div className="font-mono">
                  {typeof currentPrice === "number" && Number.isFinite(currentPrice)
                    ? `$${currentPrice.toFixed(2)}`
                    : typeof s0FromArt === "number" && Number.isFinite(s0FromArt)
                    ? `$${Number(s0FromArt).toFixed(2)}`
                    : "—"}
                </div>
              </div>

              {/* P(up) over horizon */}
              <div>
                <div className="opacity-60">P(up)</div>
                <div className={`font-mono ${probMeta.color}`}>{fmtPct(probMeta.v)}</div>
              </div>
              <div>
                <div className="opacity-60">P(up next)</div>
                <div className="font-mono">
                  {Number.isFinite(probUpNext as any)
                    ? fmtPct(probUpNext!)
                    : "—"}
                </div>
              </div>
              {/* Median Δ at horizon */}
              <div>
                <div className="opacity-60">Median Δ (H)</div>
                <div className="font-mono">
                  {typeof kpiMedianDeltaPct === "number"
                    ? `${kpiMedianDeltaPct.toFixed(1)}%`
                    : "—"}
                </div>
              </div>

              {/* Fan bands present? */}
              <div>
                <div className="opacity-60">Bands</div>
                <div className="font-mono">{art ? "P80 / P95" : "—"}</div>
              </div>

              {/* Most likely (mode) */}
              <div className="col-span-2 lg:col-span-1">
                <div className="opacity-60">Most likely (mode)</div>
                <div className={`font-mono ${modeColor}`}>
                  {Number.isFinite(modePrice) && Number.isFinite(s0FromArt) ? (
                    <>
                      ${modePrice!.toFixed(2)}{" "}
                      <span>
                        ({(modePct! >= 0 ? "+" : "") + modePct!.toFixed(1)}%)
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </div>
              </div>

              {/* 10% HDI (around mode) */}
              <div className="col-span-2 lg:col-span-1">
                <div className="opacity-60">10% HDI</div>
                <div className="font-mono">
                  {Number.isFinite(hdiLow) && Number.isFinite(hdiHigh)
                    ? `$${hdiLow!.toFixed(2)} – $${hdiHigh!.toFixed(2)}`
                    : "—"}
                </div>
              </div>
            </div>
          </Card>

        </section>
        {/* Controls + charts grid */}
        <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Simulation Controls */}
          <Card title="Simulation Controls">
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
                  max={3650}
                  className="w-full px-2 py-1 rounded bg-[#13161a] border border-[#23262b] text-sm"
                  value={horizon}
                  onChange={(e) => {
                    const v = e.currentTarget.value;
                    if (v === "") return setHorizon("");
                    const n = e.currentTarget.valueAsNumber;
                    setHorizon(Number.isFinite(n) ? n : "");
                  }}
                  onBlur={(e) => {
                    const n = coerceDays(e.currentTarget.value);
                    if (!Number.isFinite(n)) return;
                    const clamped = Math.max(1, Math.min(3650, n));
                    if (clamped !== n) throttledLog("Horizon clamped to [1, 3650].");
                    setHorizon(clamped);
                  }}
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
                  onChange={(e) => {
                    const v = e.currentTarget.valueAsNumber;
                    setPaths(Number.isFinite(v) ? v : paths);
                  }}
                  onBlur={(e) => {
                    const v = e.currentTarget.valueAsNumber;
                    if (!Number.isFinite(v)) return;
                    const clamped = Math.max(100, Math.min(10000, v));
                    if (clamped !== v) throttledLog("Paths clamped to [100, 10000].");
                    setPaths(clamped);
                  }}
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
              <div className="flex flex-wrap items-center gap-2">
                <LoadingButton
                  type="button"
                  label="Quick Sim (6m)"
                  loadingLabel={`Simulating…${typeof progress === "number" ? ` ${Math.round(progress)}%` : ""}`}
                  loading={isSimulating}
                  onClick={() => !isSimulating && runSimulation("quick")}
                  className={[
                    "relative overflow-hidden isolate rounded-xl px-4 py-2",
                    "border border-white/20 bg-black/40 backdrop-blur",
                    "text-indigo-200 font-semibold",
                    "transition will-change-transform hover:translate-y-[0.5px]",
                    "shadow-[0_0_0_0_rgba(0,0,0,0)] hover:shadow-[0_0_22px_0_rgba(99,102,241,0.18)]",
                    // conic glow (indigo-lean) kept inside bounds
                    "before:content-[''] before:absolute before:inset-0 before:-z-10 before:rounded-[inherit]",
                    "before:bg-[conic-gradient(from_180deg_at_50%_50%,rgba(99,102,241,.25),rgba(16,185,129,.12),rgba(99,102,241,.25))] before:opacity-60 before:blur-[10px]"
                  ].join(" ")}
                />
                <LoadingButton
                  type="button"
                  label="Deep Sim (10y)"
                  loadingLabel={`Simulating…${typeof progress === "number" ? ` ${Math.round(progress)}%` : ""}`}
                  loading={isSimulating}
                  onClick={() => !isSimulating && runSimulation("deep")}
                  className={[
                    "relative overflow-hidden isolate rounded-xl px-4 py-2",
                    "border border-white/20 bg-black/40 backdrop-blur",
                    "text-[#CBA135] font-semibold",
                    "transition will-change-transform hover:translate-y-[0.5px]",
                    "shadow-[0_0_0_0_rgba(0,0,0,0)] hover:shadow-[0_0_22px_0_rgba(203,161,53,0.22)]",
                    "before:content-[''] before:absolute before:inset-0 before:-z-10 before:rounded-[inherit]",
                    "before:bg-[conic-gradient(from_180deg_at_50%_50%,rgba(203,161,53,.28),rgba(255,255,255,.06),rgba(203,161,53,.28))] before:opacity-70 before:blur-[12px]"
                  ].join(" ")}
                />
                {/* Legacy controls (hidden by default) */}
                <OnlyLegacy>
                  <LoadingButton
                    type="button"
                    label="Train"
                    loadingLabel="Training…"
                    loading={isTraining}
                    onClick={handleTrainModelClick}
                    className="rounded-xl px-4 py-2 border border-white/15 hover:bg-white/5"
                  />
                </OnlyLegacy>
                <OnlyLegacy>
                  <LoadingButton
                    type="button"
                    label="Predict"
                    loadingLabel="Predicting…"
                    loading={isPredicting}
                    onClick={handleRunPredictClick}
                    className="rounded-xl px-4 py-2 border border-white/15 hover:bg-white/5"
                  />
                </OnlyLegacy>

                {/* Admin-only */}
                <OnlyAdmin>
                  <LoadingButton
                    type="button"
                    label="Label now"
                    onClick={labelNowAction}
                    className="rounded-xl px-4 py-2 border border-white/15 hover:bg-white/5"
                  />
                </OnlyAdmin>
                <OnlyAdmin>
                  <LoadingButton
                    type="button"
                    label="Learn now"
                    onClick={learnNowAction}
                    className="rounded-xl px-4 py-2 border border-white/15 hover:bg-white/5"
                  />
                </OnlyAdmin>
              </div>

          </Card>
          {/* Simetrix AI */}
          <Card className="mx-4 mt-4">
            <div className="p-4">
              <div className="text-sm opacity-60 mb-2">Simetrix AI</div>
              {runId ? (
                <SimSummaryCard apiBase={API_BASE} runId={runId} />
              ) : (
                <div className="p-4 rounded-xl border border-white/10 bg-white/5 text-sm opacity-60">Powered by xAI.</div>
              )}
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
              <EB>
                <Suspense fallback={<div className="text-xs text-gray-400">Loading chart…</div>}>
                  {art ? <FanChart artifact={art} /> : <div className="text-xs opacity-70">Run a simulation to view.</div>}
                </Suspense>
              </EB>
              {art && <div className="mt-2"><InlineLegend /></div>}
            </div>
          </Card>
          {/* Hit Probabilities */}
          <TargetsAndOdds
            spot={art?.targets?.spot ?? currentPrice ?? 0}
            horizonDays={art?.targets?.horizon_days ?? Number(horizon || 0)}
            rows={targetsRows}
          />
          {/* Terminal Distribution */}
          <Card
            title="Terminal Distribution"
            actions={<CardMenu items={[{ label: "Export PNG", onClick: () => exportChart("terminal"), disabled: !art }]} />}
          >
            <div data-chart="terminal">
              <EB>
                <Suspense fallback={<div className="text-xs text-gray-400">Loading chart…</div>}>
                  {Array.isArray(art?.terminal_prices) && art!.terminal_prices.length ? (
                    <TerminalDistribution
                      prices={(art!.terminal_prices || []).filter(
                        (v): v is number => typeof v === "number" && Number.isFinite(v)
                      )}
                    />
                  ) : (
                    <div className="text-xs opacity-70">No terminal distribution yet.</div>
                  )}
                </Suspense>
              </EB>
            </div>
          </Card>
          {/* Drivers */}
          <Card
            title="Drivers (Explainability)"
            actions={<CardMenu items={[{ label: "Export PNG", onClick: () => exportChart("drivers"), disabled: !drivers?.length }]} />}
          >
            <div data-chart="drivers">
              <EB>
                <Suspense fallback={<div className="text-xs text-gray-400">Loading chart…</div>}>
                  {drivers?.length ? (
                    <DriversWaterfall
                      drivers={drivers.map((d) => ({
                        feature: d.feature,
                        weight: typeof d.weight === "number" && Number.isFinite(d.weight) ? d.weight : 0,
                      }))}
                    />
                  ) : (
                    <div className="text-xs opacity-70">No drivers yet.</div>
                  )}
                </Suspense>
              </EB>
            </div>
          </Card>
          {/* Run Summary */}
          <Card title="Run Summary">
            <EB>
              {art ? (
                <SummaryCard
                  probUpLabel={fmtPct(probMeta.v)}
                  probUpColor={probMeta.color}
                  progress={progress}
                  currentPrice={typeof currentPrice === "number" && Number.isFinite(currentPrice) ? currentPrice : undefined}
                  eod={eod || undefined}
                />
              ) : (
                <div className="text-xs opacity-70">Run a simulation to view summary.</div>
              )}
            </EB>
          </Card>

          {/* Activity Log */}
          <Card title="Activity Log">
            <div ref={logRef} className={`overflow-auto ${LOG_HEIGHT} whitespace-pre-wrap text-xs`}>
              {(Array.isArray(logMessages) ? logMessages : []).map((m, i) => {
                const str = String(m ?? "");
                const isUp = str.startsWith("[UP]");
                const isDown = str.startsWith("[DOWN]");
                const cls = isUp ? "text-emerald-400" : isDown ? "text-rose-400" : "opacity-80";
                const text = (isUp || isDown) ? str.replace(/^\[(UP|DOWN)\]\s*/, "") : str;
                return (
                  <div key={i} className={cls}>
                    {text}
                  </div>
                );
              })}
            </div>
          </Card>
          {/* Scenarios */}
          <Card title="Scenarios" className="md:col-span-2">
            <EB>
              <Suspense fallback={<div className="text-xs text-gray-400">Loading…</div>}>
                {art ? <ScenarioTiles artifact={art} /> : <div className="text-xs opacity-70">—</div>}
              </Suspense>
            </EB>
          </Card>
          {/* Track Record */}
          <Card title="Track Record">
            <EB>
              <TrackRecordPanel
                runs={useMemo(
                  () =>
                    (Array.isArray(runHistory) ? runHistory : []).map((r) => ({
                      ...r,
                      q50: typeof r.q50 === "number" && Number.isFinite(r.q50) ? r.q50 : undefined,
                      probUp: typeof r.probUp === "number" && Number.isFinite(r.probUp) ? r.probUp : undefined,
                    })),
                  [runHistory]
                )}
              />
            </EB>
          </Card>
          {/* News */}
          <EB>
            {includeNews ? (
              <NewsList
                symbol={symbol}
                items={Array.isArray(newsItems) ? newsItems : []}
                loading={!!newsLoading}
                error={newsError}
                onLoadMore={loadMore}
                nextCursor={nextCursor}
                maxHeight={360}
              />
            ) : (
              <ListCard title="News" subtitle={symbol.toUpperCase()} maxHeight={220}>
                <div className="px-4 py-6 text-xs opacity-70">
                  Enable “Include news” to fetch recent headlines.
                </div>
              </ListCard>
            )}
          </EB>
        </div>
      </EB>
      {/* Right rail — recent only */}
      <EB>
        <RightRail recent={recentItems} className="px-4 pb-6 md:px-6" />
      </EB>
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
