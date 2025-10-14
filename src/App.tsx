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
import { SummaryCard } from "./components/SummaryCard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import RightRail from "./components/RightRail";
import { TrackRecordPanel } from "./components/TrackRecordPanel";
import { CardMenu } from "@/components/ui/CardMenu";
import LogoSimetrix from "@/components/branding/LogoSimetrix";
import LoadingButton from "./components/ui/LoadingButton";
import ListCard from "./ListCard";
import SimSummaryCard from "./components/SimSummaryCard";
import TargetsAndOdds from "./TargetsAndOdds";
import { applyChartTheme } from "@/theme/chartTheme";
import QuotaCard from "./components/QuotaCard";

// Lazy charts
const FanChart = React.lazy(() => import("./components/FanChart"));
const TerminalDistribution = React.lazy(() => import("./components/TerminalDistribution"));
const ScenarioTiles = React.lazy(() =>
  import("./components/PredictiveAddOns").then((m) => ({ default: m.ScenarioTiles }))
);
const DriversWaterfall = React.lazy(() =>
  import("./components/PredictiveAddOns").then((m) => ({ default: m.DriversWaterfall }))
);

const ChartFallback: React.FC = () => <div className="text-xs text-white/50">Loading chart...</div>;
const f2 = (n: any) => Number(n).toFixed(2);

type SimMode = "quick" | "deep";

const DASHBOARD_NAV = [
  { label: "Overview", href: "#overview" },
  { label: "Simulation", href: "#simulation" },
  { label: "Explainability", href: "#drivers-card" },
  { label: "News", href: "#news" },
  { label: "Docs", href: "/docs" },
] as const;

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
  eod_estimate?: { day_index: number; median: number; mean: number; p05: number; p95: number };
  targets?: { spot: number; horizon_days: number; levels: Array<{ label: string; price: number; hitEver?: number; hitByEnd?: number; tMedDays?: number }>; };
  prob_up_next?: number;
}
interface RunSummary { id: string; symbol: string; horizon: number; n_paths: number; finishedAt: string; q50?: number | null; probUp?: number | null; }

declare global { interface Window { __PP_API_BASE__?: string; } }
const API_BASE = String((typeof window !== "undefined" && window.__PP_API_BASE__) || (import.meta as any)?.env?.VITE_PT_API_BASE || "").replace(/\/+$/, "");
const api = (p: string) => `${API_BASE}${p.startsWith("/") ? "" : "/"}${p}`;

// Text-first helpers
async function safeText(r: Response) { try { return await r.text(); } catch { return "<no body>"; } }
function looksLikeHTML(s: string) { return /^\s*<!doctype html>|<html/i.test(s); }

// Canonical headers (keeps existing contract)
const resolvedPtKey = (): string => (DEFAULT_PT_KEY || "").trim();
const apiHeaders = () => ({ Accept: "application/json", "Content-Type": "application/json", "X-API-Key": resolvedPtKey() });

// Minimal Palantir-style Card locally (neutral, subtle)
const Card: React.FC<{ id?: string; title?: string; actions?: React.ReactNode; className?: string; children?: React.ReactNode }>
= ({ id, title, actions, className = "", children }) => (
  <section id={id} className={`rounded-2xl border border-white/10 bg-white/[0.04] scroll-mt-28 ${className}`}>
    {(title || actions) && (
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <div className="text-sm font-semibold">{title}</div>
        {actions}
      </div>
    )}
    <div className="p-4">{children}</div>
  </section>
);

const EB: React.FC<React.PropsWithChildren> = ({ children }) => <ErrorBoundary>{children}</ErrorBoundary>;

export default function App() {
  // --- helpers ---
  const LOG_HEIGHT = "h-40";
  const coerceDays = (h: number | '' | string): number => {
    if (typeof h === "number") return Number.isFinite(h) ? h : NaN;
    if (h === "") return NaN;
    const n = Number.parseInt(String(h), 10); return Number.isFinite(n) ? n : NaN;
  };

  // --- state ---
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
  const [probUpNext, setProbUpNext] = useState<number | null>(null);
  const [art, setArt] = useState<MCArtifact | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [recentRuns, setRecentRuns] = useState<RunSummary[]>([]);

  const logRef = useRef<HTMLDivElement | null>(null);
  const sseAbortRef = useRef<AbortController | null>(null);

  // Focus overlay for charts (no layout shift)
  type FocusKey = null | "fan" | "terminal" | "drivers" | "scenarios";
  const [focus, setFocus] = useState<FocusKey>(null);

  // Theme: force dark, apply chart theme
  useEffect(() => { document.documentElement.classList.add("dark"); try { localStorage.setItem("theme", "dark"); } catch {} }, []);
  useEffect(() => { applyChartTheme(); }, []);

  // Logs autoscroll
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logMessages]);

  // Session cookie bootstrap
  useEffect(() => { fetch(api("/session/anon"), { method: "POST", credentials: "include" }).catch(() => {}); }, []);

  const throttledLog = useMemo(() => throttle((m: string) => {
    setLogMessages((prev) => (prev[prev.length - 1] === m ? prev : prev.length >= 50 ? [...prev.slice(1), m] : [...prev, m]));
  }, 120), []);
  const throttledProgress = useMemo(() => throttle((p: number) => setProgress(p), 100), []);

  // News
  const getAuthHeaders = useCallback(() => apiHeaders(), []);
  const { items: newsItemsRaw, nextCursor, loading: newsLoading, error: newsError, loadMore } = useNews({
    symbol, includeNews, limit: 6, days: 7, retry: 0, apiBase: API_BASE, getHeaders: getAuthHeaders, onLog: throttledLog,
  });
  const newsItems = useMemo(() => (Array.isArray(newsItemsRaw) ? newsItemsRaw : []), [newsItemsRaw]);

  // Derived display
  const probMeta = useMemo(() => {
    const v = Math.max(0, Math.min(1, probUp || 0));
    const pct = Math.round(v * 100);
    const color = v > 0.51 ? "text-emerald-400" : v < 0.49 ? "text-rose-400" : "text-white/70"; // neutral for ~50%
    return { v, pct, color };
  }, [probUp]);

  const fmtPct = (x: number | undefined | null) => (Number.isFinite(x) ? (x as number) : 0).toLocaleString(undefined, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1, });
  const eod = art?.eod_estimate ?? null;

  // Export & share
  const exportChart = async (chartId: "fan" | "terminal" | "drivers" | "ladder") => {
    try {
      const container = document.querySelector(`[data-chart="${chartId}"]`) as HTMLElement | null;
      if (container) {
        const canvas = container.querySelector("canvas") as HTMLCanvasElement | null;
        const element = canvas ?? container;
        const screenshot = await html2canvas(element, { backgroundColor: "#0A0A0A" });
        const url = screenshot.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = url; const stamp = new Date().toISOString().slice(0, 10);
        link.download = `${symbol}_H${coerceDays(horizon) || "?"}_${chartId}_${stamp}.png`;
        link.click();
      }
      if (!art) { toast.error("No data available for export"); return; }
      let csvData: string[][] = [];
      switch (chartId) {
        case "fan":
          csvData = [["Day","Median","P80 Low","P80 High","P95 Low","P95 High"], ...art.median_path.map(([t], i) => [
            `D${t}`, f2(art.median_path[i]?.[1]), f2(art.bands?.p80_low?.[i]?.[1]), f2(art.bands?.p80_high?.[i]?.[1]), f2(art.bands?.p95_low?.[i]?.[1]), f2(art.bands?.p95_high?.[i]?.[1]),
          ])]; break;
        case "terminal":
          csvData = [["Price","Frequency"], ...(art.terminal_prices || []).map((p) => [f2(p), "1"])]; break;
        case "drivers":
          csvData = [["Driver","Weight"], ...drivers.map((d) => [d.feature, f2(d.weight)])]; break;
        case "ladder":
          csvData = [["Target","Probability"], ...buildLadderItems(art).map((d) => [d.label, f2(d.p * 100)])]; break;
      }
      if (csvData.length) {
        const csv = csvData.map((row) => row.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const csvLink = document.createElement("a");
        csvLink.href = URL.createObjectURL(blob); csvLink.download = `${symbol}_H${coerceDays(horizon) || "?"}_${chartId}.csv`;
        csvLink.click();
      }
      toast.success(`Exported ${chartId} as PNG and CSV`);
    } catch (e: any) { toast.error(`Export failed: ${e.message || e}`); }
  };
  const shareChart = (chartId: string) => {
    const state = encodeState({ symbol, horizon, paths, chartId, mode: (art as any)?.plan_used || "deep" });
    const url = `${window.location.origin}/share?state=${state}`;
    navigator.clipboard.writeText(url); toast.success("Shareable link copied.");
  };

  // Backend calls
  async function trainModel() {
    setIsTraining(true);
    throttledLog("Training model...");
    try {
      const resp = await fetch(api("/train"), {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ symbol: symbol.toUpperCase(), lookback_days: 3650 }),
      });
      const text = await safeText(resp);
      if (!resp.ok) {
        if (looksLikeHTML(text)) throw new Error("Misrouted to HTML. Check API base.");
        throw new Error(`Train failed: ${resp.status} - ${text}`);
      }
      throttledLog("Model trained successfully.");
    } catch (e: any) {
      throttledLog(`Error: ${e.message || e}`);
    } finally {
      setIsTraining(false);
    }
  }

  async function runPredict() {
    const h = coerceDays(horizon);
    if (!Number.isFinite(h) || h < 1) { throttledLog("Error: Please enter a horizon (days)."); return; }
    if (h > 365) { throttledLog("Error: Predict horizon must be <= 365 days."); return; }
    throttledLog(`Running prediction... [${symbol.toUpperCase()} H${h}]`);
    setIsPredicting(true);
    try {
      const resp = await fetch(api("/predict"), {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ symbol: symbol.toUpperCase(), horizon_days: h }),
      });
      const text = await safeText(resp);
      if (!resp.ok) {
        if (looksLikeHTML(text)) throw new Error("Misrouted to HTML. Check API base.");
        throw new Error(`Predict failed: ${resp.status} - ${text}`);
      }
      const js = JSON.parse(text);
      const pu = Number(js?.prob_up_next);
      if (Number.isFinite(pu)) setProbUpNext(pu);
      throttledLog(`Prediction: Prob Up Next = ${Number.isFinite(pu) ? (pu * 100).toFixed(2) : "?"}%`);
    } catch (e: any) {
      throttledLog(`Error: ${e.message || e}`);
    } finally {
      setIsPredicting(false);
    }
  }

  async function runSimulation(mode: SimMode) {
    const hNum = coerceDays(horizon);
    if (!Number.isFinite(hNum) || hNum < 1) { throttledLog("Error: Please enter a horizon (days)."); return; }
    if (hNum > 3650) { throttledLog("Error: Horizon must be <= 3650 days (10 years)."); return; }
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
        mode,
        symbol: symbol.toUpperCase(),
        horizon_days: Number(hNum),
        n_paths: Number(pNum),
        timespan: "day",
        include_news: !!includeNews,
        include_options: !!includeOptions,
        include_futures: !!includeFutures,
        ...(xHandles.trim() ? { x_handles: xHandles.trim() } : {}),
      };
      const start = await fetch(api("/simulate"), {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const startTxt = await safeText(start);
      if (!start.ok) {
        if (looksLikeHTML(startTxt)) throw new Error("Misrouted to HTML. Check API base.");
        throw new Error(`HTTP ${start.status} - ${startTxt}`);
      }
      const { run_id } = JSON.parse(startTxt);
      setRunId(run_id);
      throttledLog(`Queued run_id: ${run_id} [${mode.toUpperCase()}]`);

      try { sseAbortRef.current?.abort(); } catch {}
      sseAbortRef.current = new AbortController();
      try {
        await fetchEventSource(api(`/simulate/${run_id}/stream`), {
          headers: getAuthHeaders(),
          signal: sseAbortRef.current.signal,
          openWhenHidden: true,
          // @ts-ignore
          retry: 0,
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
            } catch {}
          },
          onerror: (err) => {
            throttledLog(`Stream error: ${err?.message || err}. Ending stream...`);
            try { sseAbortRef.current?.abort(); } catch {}
          },
          onclose: () => throttledLog("Stream closed."),
        });
      } catch (e: any) {
        throttledLog(`Stream failed: ${e?.message || e}. Continuing...`);
      } finally {
        try { sseAbortRef.current?.abort(); } catch {}
        sseAbortRef.current = null;
      }

      const artifactResp = await fetch(api(`/simulate/${run_id}/artifact`), { headers: getAuthHeaders() });
      const artTxt = await safeText(artifactResp);
      if (!artifactResp.ok) {
        if (looksLikeHTML(artTxt)) throw new Error("Misrouted to HTML. Check API base.");
        throw new Error(`Artifact fetch failed: ${artifactResp.status} - ${artTxt}`);
      }
      const artf: MCArtifact = JSON.parse(artTxt);
      setArt(artf);
      setDrivers(artf.drivers || []);
      setProbUp(artf.prob_up_end || 0);
      setCurrentPrice((artf as any).spot ?? artf.median_path?.[0]?.[1] ?? null);
      const puNext = Number((artf as any)?.prob_up_next);
      if (Number.isFinite(puNext)) setProbUpNext(puNext);
      try {
        if (artf && run_id) { fetch(api(`/runs/${run_id}/summary`)).catch(() => {}); }
      } catch {}

      const terminalPoint = Array.isArray(artf.median_path) && artf.median_path.length
        ? artf.median_path[artf.median_path.length - 1]?.[1]
        : null;
      const summary: RunSummary = {
        id: run_id,
        symbol: artf.symbol || symbol.toUpperCase(),
        horizon: Number(artf.horizon_days ?? hNum) || Number(hNum),
        n_paths: Number((artf as any)?.n_paths ?? pNum) || Number(pNum),
        finishedAt: new Date().toISOString(),
        probUp: typeof artf.prob_up_end === "number" ? artf.prob_up_end : null,
        q50: typeof terminalPoint === "number" && Number.isFinite(terminalPoint) ? terminalPoint : null,
      };
      setRecentRuns((prev) => {
        const filtered = prev.filter((r) => r.id !== summary.id);
        return [summary, ...filtered].slice(0, 8);
      });
    } catch (e: any) {
      throttledLog(`Error: ${e.message ?? e}`);
    } finally {
      setIsSimulating(false);
    }
  }

  // Derived KPIs
  const kpiMedianDeltaPct = (() => {
    if (!art) return null; const s0 = art.median_path?.[0]?.[1] ?? 0; const sH = art.median_path?.at(-1)?.[1] ?? 0;
    if (!s0 || !Number.isFinite(s0) || !Number.isFinite(sH)) return null; return ((sH / s0 - 1) * 100);
  })();
  const s0FromArt = (art as any)?.spot ?? (art as any)?.inputs?.S0 ?? (Array.isArray(art?.median_path) ? art?.median_path?.[0]?.[1] : null);
  const ladderRows = useMemo(() => {
    const targetLevels = art?.targets?.levels;
    if (Array.isArray(targetLevels) && targetLevels.length) {
      return targetLevels
        .map((lvl) => {
          const label = typeof lvl?.label === "string" && lvl.label.trim() ? lvl.label.trim() : `${Number(lvl?.price ?? 0).toFixed(2)}`;
          return {
            label,
            price: Number(lvl?.price ?? 0),
            hitEver: typeof lvl?.hitEver === "number" ? lvl.hitEver : undefined,
            hitByEnd: typeof lvl?.hitByEnd === "number" ? lvl.hitByEnd : undefined,
            tMedDays: typeof lvl?.tMedDays === "number" ? lvl.tMedDays : undefined,
          };
        })
        .filter((lvl) => Number.isFinite(lvl.price));
    }
    if (!art || !currentPrice) {
      return [] as Array<{ label: string; price: number; hitEver?: number; hitByEnd?: number; tMedDays?: number }>;
    }
    const rung = (price: number, label: string) => ({
      label,
      price,
      hitEver: undefined,
      hitByEnd: undefined,
      tMedDays: undefined,
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

  const loadRunConfig = useCallback(
    (run: RunSummary) => {
      setSymbol(run.symbol);
      setHorizon(run.horizon);
      setPaths(run.n_paths);
      toast.success(`Loaded ${run.symbol} (H${run.horizon}) into controls`);
    },
    [setSymbol, setHorizon, setPaths]
  );

  const rightRailItems = useMemo(
    () =>
      recentRuns.map((run) => ({
        title: `${run.symbol} | H${run.horizon}`,
        subtitle: `${run.n_paths.toLocaleString()} paths${typeof run.probUp === "number" ? ` | ${Math.round(run.probUp * 100)}% up` : ""}`,
        onClick: () => loadRunConfig(run),
      })),
    [recentRuns, loadRunConfig]
  );

  const navItems = DASHBOARD_NAV;

  useEffect(() => {
    let cancelled = false;
    const fetchRecentRuns = async () => {
      try {
        const resp = await fetch(api("/runs/recent?limit=8"), {
          headers: getAuthHeaders(),
          credentials: "include",
        });
        const txt = await safeText(resp);
        if (!resp.ok) {
          const msg = txt || `HTTP ${resp.status}`;
          throw new Error(msg);
        }
        const body = txt ? JSON.parse(txt) : {};
        const rawList = Array.isArray(body?.items) ? body.items : Array.isArray(body) ? body : [];
        const normalized = rawList
          .map((raw: any, idx: number): RunSummary | null => {
            const id = raw?.id ?? raw?.run_id ?? raw?.runId ?? `recent-${idx}`;
            const symbolRaw = typeof raw?.symbol === "string" ? raw.symbol : typeof raw?.ticker === "string" ? raw.ticker : null;
            const horizonRaw = raw?.horizon ?? raw?.horizon_days ?? raw?.horizonDays ?? raw?.days;
            const nPathsRaw = raw?.n_paths ?? raw?.paths ?? raw?.nPaths ?? raw?.num_paths;
            const probUpRaw = raw?.prob_up_end ?? raw?.probUp ?? raw?.pUp ?? raw?.prob_up;
            const q50Raw = raw?.q50 ?? raw?.median ?? raw?.median_terminal;
            if (!id || !symbolRaw) return null;
            return {
              id: String(id),
              symbol: String(symbolRaw).toUpperCase(),
              horizon: Number.isFinite(Number(horizonRaw)) ? Number(horizonRaw) : 0,
              n_paths: Number.isFinite(Number(nPathsRaw)) ? Number(nPathsRaw) : 0,
              finishedAt: String(raw?.finishedAt || raw?.finished_at || raw?.created_at || raw?.completed_at || ""),
              probUp: Number.isFinite(Number(probUpRaw)) ? Number(probUpRaw) : null,
              q50: Number.isFinite(Number(q50Raw)) ? Number(q50Raw) : null,
            };
          })
          .filter((r): r is RunSummary => !!r);
        if (!cancelled && normalized.length) {
          setRecentRuns(normalized);
        }
      } catch (err: any) {
        if (!cancelled) {
          throttledLog(`Recent runs error: ${err?.message || err}`);
        }
      }
    };
    fetchRecentRuns();
    return () => {
      cancelled = true;
    };
  }, [api, getAuthHeaders, throttledLog]);

  // -- render --
  return (
    <main className="min-h-screen bg-black text-white">
      <Toaster position="bottom-right" />
      <EB>
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6 md:px-8">
            <div className="flex items-center gap-3 text-sm">
              <LogoSimetrix size={24} tone="light" lockup="horizontal" animated={false} />
              <span className="font-semibold tracking-wide">SIMETRIX DASH</span>
            </div>
            <nav className="hidden items-center gap-5 text-sm text-white/70 md:flex">
              {navItems.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="relative rounded-lg px-3 py-1.5 transition hover:text-white"
                >
                  <span
                    className="pointer-events-none absolute -inset-2 -z-10 rounded-xl opacity-0 transition-opacity duration-200 hover:opacity-100"
                    style={{ background: "radial-gradient(120px 120px at 50% 50%, rgba(255,255,255,0.16), transparent 60%)" }}
                  />
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-2 text-sm">
              <a
                href="/how-it-works"
                className="hidden items-center rounded-xl border border-white/20 px-3 py-1.5 text-white/80 transition hover:bg-white/10 sm:inline-flex"
              >
                How it works
              </a>
              <a
                href="#simulation"
                className="inline-flex items-center rounded-xl border border-white/20 px-3 py-1.5 transition hover:bg-white/10"
              >
                Jump to controls
              </a>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-6 pb-12 md:px-8 xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-6">
          <div className="space-y-6">
            <section id="overview" className="grid grid-cols-1 gap-6 pt-6 md:grid-cols-3">
              <Card id="overview-quant" className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-white/60">Daily Quant Picks</div>
                </div>
                <div className="mt-3">
                  <DailyQuantCard
                    apiBase={API_BASE}
                    getHeaders={getAuthHeaders}
                    onOpen={(sym, h) => {
                      setSymbol(sym);
                      setHorizon(h || 30);
                    }}
                  />
                </div>
                <div className="mt-2 text-[10px] leading-4 text-white/50">For research and educational use.</div>
              </Card>

              <Card id="overview-kpis">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-white/60">Current</div>
                    <div className="font-mono">
                      {typeof currentPrice === "number" && Number.isFinite(currentPrice)
                        ? `$${currentPrice.toFixed(2)}`
                        : typeof s0FromArt === "number" && Number.isFinite(s0FromArt)
                          ? `$${Number(s0FromArt).toFixed(2)}`
                          : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/60">P(up)</div>
                    <div className={`font-mono ${probMeta.color}`}>{fmtPct(probMeta.v)}</div>
                  </div>
                  <div>
                    <div className="text-white/60">P(up next)</div>
                    <div className="font-mono">
                      {Number.isFinite(probUpNext as any) ? fmtPct(probUpNext!) : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/60">Median delta (H)</div>
                    <div className="font-mono">
                      {typeof kpiMedianDeltaPct === "number" ? `${kpiMedianDeltaPct.toFixed(1)}%` : "-"}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <QuotaCard />
                </div>
              </Card>
            </section>

            <section id="simulation" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card id="controls-card" title="Simulation Controls">
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Field label="Ticker / Symbol">
                      <input
                        className="w-full rounded-lg border border-white/15 bg-black/50 px-2 py-2 text-sm"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                        placeholder="e.g., NVDA"
                      />
                    </Field>
                    <Field label="Horizon (days)">
                      <input
                        type="number"
                        min={1}
                        max={3650}
                        className="w-full rounded-lg border border-white/15 bg-black/50 px-2 py-2 text-sm"
                        value={horizon}
                        onChange={(e) => {
                          const v = e.currentTarget.value;
                          if (v === "") return setHorizon("");
                          const n = e.currentTarget.valueAsNumber;
                          setHorizon(Number.isFinite(n) ? n : "");
                        }}
                        placeholder="30"
                      />
                    </Field>
                    <Field label="Paths">
                      <input
                        type="number"
                        min={100}
                        step={100}
                        className="w-full rounded-lg border border-white/15 bg-black/50 px-2 py-2 text-sm"
                        value={paths}
                        onChange={(e) => {
                          const v = e.currentTarget.valueAsNumber;
                          setPaths(Number.isFinite(v) ? v : paths);
                        }}
                        placeholder="2000"
                      />
                    </Field>
                    <div className="col-span-2 lg:col-span-4">
                      <Field label="X (Twitter) handles - optional">
                        <input
                          className="w-full rounded-lg border border-white/15 bg-black/50 px-2 py-2 text-sm"
                          value={xHandles}
                          onChange={(e) => setXHandles(e.target.value)}
                          placeholder="comma,separated,handles"
                        />
                      </Field>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={includeOptions}
                        onChange={(e) => setIncludeOptions(e.target.checked)}
                      />
                      Include options
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={includeFutures}
                        onChange={(e) => setIncludeFutures(e.target.checked)}
                      />
                      Include futures
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={includeNews}
                        onChange={(e) => setIncludeNews(e.target.checked)}
                      />
                      Include news
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <LoadingButton
                      label="Quick Sim"
                      loadingLabel={`Simulating... ${Math.round(progress)}%`}
                      loading={isSimulating}
                      onClick={() => !isSimulating && runSimulation("quick")}
                      className="rounded-xl border border-white/20 bg-black/40 px-4 py-2 text-white transition hover:bg-white/10"
                    />
                    <LoadingButton
                      label="Deep Sim"
                      loadingLabel={`Simulating... ${Math.round(progress)}%`}
                      loading={isSimulating}
                      onClick={() => !isSimulating && runSimulation("deep")}
                      className="rounded-xl border border-white/20 bg-black/40 px-4 py-2 text-white transition hover:bg-white/10"
                    />
                    <LoadingButton
                      label="Predict"
                      loadingLabel="Predicting..."
                      loading={isPredicting}
                      onClick={runPredict}
                      className="rounded-xl border border-white/20 bg-black/40 px-4 py-2 text-white transition hover:bg-white/10"
                    />
                    <LoadingButton
                      label="Train Model"
                      loadingLabel="Training..."
                      loading={isTraining}
                      onClick={trainModel}
                      className="rounded-xl border border-white/20 bg-black/40 px-4 py-2 text-white transition hover:bg-white/10"
                    />
                  </div>
                </Card>

                <Card
                  id="fan-card"
                  title="Price Forecast"
                  actions={
                    <CardMenu
                      items={[
                        { label: "Focus", onClick: () => setFocus("fan"), disabled: !art },
                        { label: "Export PNG", onClick: () => exportChart("fan"), disabled: !art },
                        { label: "Share link", onClick: () => shareChart("fan"), disabled: !art },
                      ]}
                    />
                  }
                  className="lg:col-span-2"
                >
                  <div data-chart="fan" className="h-64 md:h-80">
                    <EB>
                      <Suspense fallback={<ChartFallback />}>
                        {art ? (
                          <FanChart artifact={art} />
                        ) : (
                          <div className="text-xs text-white/60">Run a simulation to view.</div>
                        )}
                      </Suspense>
                    </EB>
                    {art && (
                      <div className="mt-2">
                        <InlineLegend />
                      </div>
                    )}
                  </div>
                </Card>

                <div id="targets-card" className="lg:col-span-1">
                  <TargetsAndOdds
                    spot={art?.targets?.spot ?? currentPrice ?? 0}
                    horizonDays={art?.targets?.horizon_days ?? Number(horizon || 0)}
                    rows={ladderRows}
                  />
                </div>

                <Card
                  id="terminal-card"
                  title="Terminal Distribution"
                  actions={
                    <CardMenu
                      items={[
                        { label: "Focus", onClick: () => setFocus("terminal"), disabled: !art },
                        { label: "Export PNG", onClick: () => exportChart("terminal"), disabled: !art },
                      ]}
                    />
                  }
                >
                  <div data-chart="terminal" className="h-64 md:h-80">
                    <EB>
                      <Suspense fallback={<ChartFallback />}>
                        {Array.isArray(art?.terminal_prices) && art!.terminal_prices.length ? (
                          <TerminalDistribution
                            prices={(art!.terminal_prices || []).filter(
                              (v): v is number => typeof v === "number" && Number.isFinite(v)
                            )}
                          />
                        ) : (
                          <div className="text-xs text-white/60">No terminal distribution yet.</div>
                        )}
                      </Suspense>
                    </EB>
                  </div>
                </Card>

                <Card
                  id="drivers-card"
                  title="Drivers (Explainability)"
                  actions={
                    <CardMenu
                      items={[
                        { label: "Focus", onClick: () => setFocus("drivers"), disabled: !drivers?.length },
                        { label: "Export PNG", onClick: () => exportChart("drivers"), disabled: !drivers?.length },
                      ]}
                    />
                  }
                >
                  <div data-chart="drivers" className="h-64 md:h-80">
                    <EB>
                      <Suspense fallback={<ChartFallback />}>
                        {drivers?.length ? (
                          <DriversWaterfall
                            drivers={drivers.map((d) => ({
                              feature: d.feature,
                              weight: typeof d.weight === "number" && Number.isFinite(d.weight) ? d.weight : 0,
                            }))}
                          />
                        ) : (
                          <div className="text-xs text-white/60">No drivers yet.</div>
                        )}
                      </Suspense>
                    </EB>
                  </div>
                </Card>

                <Card id="summary-card" title="Run Summary">
                  <EB>
                    {art ? (
                      <SummaryCard
                        probUpLabel={fmtPct(Math.max(0, Math.min(1, probUp || 0)))}
                        probUpColor={probMeta.color}
                        progress={progress}
                        currentPrice={
                          typeof currentPrice === "number" && Number.isFinite(currentPrice) ? currentPrice : undefined
                        }
                        eod={eod || undefined}
                      />
                    ) : (
                      <div className="text-xs text-white/60">Run a simulation to view summary.</div>
                    )}
                  </EB>
                </Card>

                <Card id="scenarios-card" title="Scenarios" className="lg:col-span-2">
                  <EB>
                    <Suspense fallback={<ChartFallback />}>
                      {art ? (
                        <ScenarioTiles artifact={art} />
                      ) : (
                        <div className="text-xs text-white/60">No scenarios available.</div>
                      )}
                    </Suspense>
                  </EB>
                </Card>

                <Card id="activity-log" title="Activity Log">
                  <div
                    ref={logRef}
                    className={`overflow-auto ${LOG_HEIGHT} whitespace-pre-wrap text-xs text-white/80`}
                  >
                    {(Array.isArray(logMessages) ? logMessages : []).map((m, i) => (
                      <div key={i}>{String(m ?? "")}</div>
                    ))}
                  </div>
                </Card>

                <Card id="news" className="lg:col-span-2">
                  <EB>
                    {includeNews ? (
                      <NewsList
                        symbol={symbol}
                        items={newsItems}
                        loading={!!newsLoading}
                        error={newsError}
                        onLoadMore={loadMore}
                        nextCursor={nextCursor}
                        maxHeight={360}
                      />
                    ) : (
                      <ListCard title="News" subtitle={symbol.toUpperCase()} maxHeight={220}>
                        <div className="px-4 py-6 text-xs text-white/60">
                          Enable "Include news" to fetch recent headlines.
                        </div>
                      </ListCard>
                    )}
                  </EB>
                </Card>

                <Card id="simetrix-ai">
                  <div className="mb-2 text-sm text-white/60">Simetrix AI</div>
                  {runId ? (
                    <SimSummaryCard apiBase={API_BASE} runId={runId} />
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                      Powered by xAI.
                    </div>
                  )}
                </Card>
              </div>
            </section>

            <section id="track-record">
              <EB>
                <TrackRecordPanel runs={recentRuns} onRowClick={loadRunConfig} />
              </EB>
            </section>

            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border border-white/15 bg-black/60 px-3 py-1.5 text-sm hover:bg-white/10"
                onClick={() => exportArtifact(art)}
                disabled={!art}
              >
                Export artifact JSON
              </button>
            </div>
          </div>

          <aside className="hidden xl:block xl:pt-6">
            <EB>
              <RightRail recent={rightRailItems} className="sticky top-24" />
            </EB>
          </aside>
        </div>

        <div className="mx-auto max-w-7xl px-6 pb-8 md:px-8 xl:hidden">
          <EB>
            <RightRail recent={rightRailItems} />
          </EB>
        </div>
      </EB>

      {/* Focus Overlay */}
      <FocusOverlay open={!!focus} title={focus === "fan" ? "Price Forecast" : focus === "terminal" ? "Terminal Distribution" : focus === "drivers" ? "Drivers (Explainability)" : focus === "scenarios" ? "Scenarios" : ""} onClose={() => setFocus(null)}>
        <div className="h-[68vh]">
          <EB>
            <Suspense fallback={<ChartFallback />}> {
              focus === "fan" ? (art ? <FanChart artifact={art} /> : <div className="text-xs text-white/60">Run a simulation to view.</div>) :
              focus === "terminal" ? (Array.isArray(art?.terminal_prices) && art!.terminal_prices.length ? <TerminalDistribution prices={(art!.terminal_prices || []).filter((v): v is number => typeof v === "number" && Number.isFinite(v))} /> : <div className="text-xs text-white/60">No terminal distribution yet.</div>) :
              focus === "drivers" ? (drivers?.length ? <DriversWaterfall drivers={drivers.map((d) => ({ feature: d.feature, weight: typeof d.weight === "number" && Number.isFinite(d.weight) ? d.weight : 0 }))} /> : <div className="text-xs text-white/60">No drivers yet.</div>) :
              focus === "scenarios" ? (art ? <ScenarioTiles artifact={art} /> : <div className="text-xs text-white/60">-</div>) : null
            } </Suspense>
          </EB>
        </div>
      </FocusOverlay>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-white/60">{label}</div>
      {children}
    </label>
  );
}

// Overlay component to prevent layout shift when reading charts
function FocusOverlay({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode; }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm">
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <section className="w-full max-w-6xl rounded-2xl border border-white/15 bg-black shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="text-sm font-semibold">{title}</div>
            <div className="flex items-center gap-2 text-xs">
              <button className="rounded-md border border-white/15 px-3 py-1 hover:bg-white/10" onClick={onClose}>Close</button>
            </div>
          </div>
          <div className="p-4"><div className="rounded-lg border border-white/10 bg-black/50 overflow-hidden">{children}</div></div>
        </section>
      </div>
    </div>
  );
}

// ---- Utilities ----
function buildLadderItems(art: MCArtifact) {
  if (!art?.hit_probs?.thresholds_abs?.length) return [] as { label: string; p: number }[];
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
  const a = document.createElement("a"); a.href = url; a.download = `mc_${art.symbol}_${art.horizon_days}d.json`; a.click(); URL.revokeObjectURL(url);
  toast.success("Exported artifact as JSON");
}
