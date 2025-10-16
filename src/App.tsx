import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import html2canvas from "html2canvas";
import "chart.js/auto";
import DailyQuantCard from "./components/DailyQuantCard";
import { encodeState } from "./utils/stateShare";

import NewsList from "./components/NewsList";
import { useNews } from "@/hooks/useNews";
import { InlineLegend } from "./components/InlineLegend";
import { SummaryCard } from "./components/SummaryCard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import RightRail from "./components/RightRail";
import { TrackRecordPanel } from "./components/TrackRecordPanel";
import type { RunRow } from "./components/TrackRecordPanel";
import { CardMenu } from "@/components/ui/CardMenu";
import LogoSimetrix from "@/components/branding/LogoSimetrix";
import LoadingButton from "./components/ui/LoadingButton";
import ListCard from "./ListCard";
import TickerAutocomplete from "./components/TickerAutocomplete";
import SimSummaryCard from "./components/SimSummaryCard";
import TargetsAndOdds from "./TargetsAndOdds";
import { applyChartTheme } from "@/theme/chartTheme";
import QuotaCard from "./components/QuotaCard";
import ContextRibbon from "./components/ContextRibbon";
import { resolveApiBase, resolveApiKey } from "@/utils/apiConfig";
import { DashboardProvider, useDashboard } from "@/dashboard/DashboardProvider";
import type { SimMode, MCArtifact, RunSummary } from "@/types/simulation";

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

const DEFAULT_POLYGON_API_KEY = ""; // intentionally blank; require user-supplied key

const DASHBOARD_NAV = [
  { label: "Overview", href: "#overview" },
  { label: "Simulation", href: "#simulation" },
  { label: "Explainability", href: "#drivers-card" },
  { label: "News", href: "#news" },
  { label: "Docs", href: "/docs" },
] as const;

// ---- Types ----
type MaybeNumber = number | string | null | undefined;

type DiagnosticsSnapshot = {
  mu?: { pre?: number | null; post?: number | null } | null;
  sigma?: { pre?: number | null; post?: number | null } | null;
  mu_pre?: number | null;
  mu_post?: number | null;
  sigma_pre?: number | null;
  sigma_post?: number | null;
  sentiment?: {
    avg_sent_7d?: MaybeNumber;
    avg_sent_last24h?: MaybeNumber;
    last24h?: MaybeNumber;
    avg7d?: MaybeNumber;
  } | null;
  earnings?: {
    surprise_pct?: MaybeNumber;
    surprise_percent?: MaybeNumber;
    surprise?: MaybeNumber;
    days_since?: MaybeNumber;
    last_days?: MaybeNumber;
  } | null;
  macro?: {
    rff?: MaybeNumber;
    cpi_yoy?: MaybeNumber;
    u_rate?: MaybeNumber;
    updated_at?: string | null;
  } | null;
  regime?: { name?: string | null; score?: MaybeNumber } | null;
  scheduler?: Record<string, unknown> | null;
  context?: Record<string, unknown> | null;
  [key: string]: unknown;
};

const API_BASE = resolveApiBase();
const api = (p: string) => `${API_BASE}${p.startsWith("/") ? "" : "/"}${p}`;

// Text-first helpers
async function safeText(r: Response) { try { return await r.text(); } catch { return "<no body>"; } }

// Canonical headers (keeps existing contract)
const apiHeaders = () => {
  const key = resolveApiKey();
  const baseHeaders = { Accept: "application/json", "Content-Type": "application/json" };
  return key ? { ...baseHeaders, "X-API-Key": key } : baseHeaders;
};

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
  const getAuthHeaders = useCallback(() => apiHeaders(), []);
  return (
    <DashboardProvider api={api} getAuthHeaders={getAuthHeaders}>
      <DashboardApp />
    </DashboardProvider>
  );
}

function DashboardApp() {
  const { sim, getAuthHeaders } = useDashboard();
  // --- helpers ---
  const LOG_HEIGHT = "h-48";
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

  const polygonKey = useMemo(() => {
    const envMap = (import.meta as any)?.env ?? {};
    const candidates = [
      typeof window !== "undefined" ? window.localStorage?.getItem("polygon_api_key") : undefined,
      envMap?.VITE_POLYGON_API_KEY,
      envMap?.VITE_POLYGON_KEY,
      DEFAULT_POLYGON_API_KEY,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string") {
        const trimmed = candidate.trim();
        if (trimmed) return trimmed;
      }
    }
    return "";
  }, []);
  const hasPolygonKey = useMemo(() => polygonKey.trim().length > 0, [polygonKey]);

  const {
    isTraining,
    isPredicting,
    isSimulating,
    logMessages,
    progress,
    drivers,
    probUp,
    probUpNext,
    art,
    currentPrice,
    runId,
    recentRuns,
    setRecentRuns,
    runPredict,
    runSimulation,
  } = sim;

  const authHeaders = useMemo(() => getAuthHeaders(), [getAuthHeaders]);

  const handlePredict = useCallback(() => {
    runPredict({ symbol, horizonDays: coerceDays(horizon) });
  }, [runPredict, symbol, horizon]);

  const handleSimulation = useCallback(
    (mode: SimMode) => {
      runSimulation({
        mode,
        symbol,
        horizonDays: coerceDays(horizon),
        nPaths: paths,
        includeNews,
        includeOptions,
        includeFutures,
        xHandles,
      });
    },
    [
      runSimulation,
      symbol,
      horizon,
      paths,
      includeNews,
      includeOptions,
      includeFutures,
      xHandles,
    ]
  );

  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      sim.abortStream();
    };
  }, [sim.abortStream]);

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

  // News
  const { items: newsItemsRaw, nextCursor, loading: newsLoading, error: newsError, loadMore } = useNews({
    symbol, includeNews, limit: 6, days: 7, retry: 0, apiBase: API_BASE, getHeaders: getAuthHeaders, onLog: sim.throttledLog,
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
  const diagnostics = useMemo(() => {
    const raw = art?.diagnostics as DiagnosticsSnapshot | null | undefined;
    if (!raw) return null;
    const toNum = (val: unknown): number | null => {
      const num = typeof val === "string" ? Number(val) : val;
      return typeof num === "number" && Number.isFinite(num) ? num : null;
    };
    const maybeMu = (raw?.mu ?? null) as any;
    const maybeSigma = (raw?.sigma ?? null) as any;
    const muPre = toNum(maybeMu?.pre ?? raw?.mu_pre ?? maybeMu?.before ?? (raw as any)?.mu_before);
    const muPost = toNum(maybeMu?.post ?? raw?.mu_post ?? maybeMu?.after ?? (raw as any)?.mu_after);
    const sigmaPre = toNum(maybeSigma?.pre ?? raw?.sigma_pre ?? maybeSigma?.before ?? (raw as any)?.sigma_before);
    const sigmaPost = toNum(maybeSigma?.post ?? raw?.sigma_post ?? maybeSigma?.after ?? (raw as any)?.sigma_after);
    const context = (raw?.context ?? {}) as Record<string, unknown>;
    const sentimentSrc = (raw?.sentiment ?? context?.sentiment) as Record<string, unknown> | undefined;
    const earningsSrc = (raw?.earnings ?? context?.earnings) as Record<string, unknown> | undefined;
    const macroSrc = (raw?.macro ?? context?.macro) as Record<string, unknown> | undefined;
    const regimeSrc = (raw?.regime ?? context?.regime) as Record<string, unknown> | undefined;
    const schedulerSrc = (raw?.scheduler ?? context?.scheduler) as Record<string, unknown> | undefined;

    const sentimentAvg7d = toNum(
      sentimentSrc?.avg_sent_7d ?? sentimentSrc?.avg7d ?? sentimentSrc?.avg ?? sentimentSrc?.avg_7d
    );
    const sentiment24h = toNum(
      sentimentSrc?.avg_sent_last24h ?? sentimentSrc?.last24h ?? sentimentSrc?.day ?? sentimentSrc?.last_24h
    );
    const sentimentDelta =
      typeof sentimentAvg7d === "number" && typeof sentiment24h === "number"
        ? sentiment24h - sentimentAvg7d
        : null;

    const earningsSurprise = toNum(
      earningsSrc?.surprise_pct ??
        earningsSrc?.surprise_percent ??
        earningsSrc?.surprise ??
        earningsSrc?.last_surprise_pct
    );
    const earningsDaysSince = toNum(
      earningsSrc?.days_since ?? earningsSrc?.days ?? earningsSrc?.last_days ?? earningsSrc?.last_event_days_ago
    );

    const macroRff = toNum(macroSrc?.rff);
    const macroCpi = toNum(macroSrc?.cpi_yoy ?? macroSrc?.cpi);
    const macroURate = toNum(macroSrc?.u_rate ?? macroSrc?.unemployment);
    const macroUpdatedAt =
      typeof macroSrc?.updated_at === "string" && macroSrc.updated_at.trim()
        ? macroSrc.updated_at.trim()
        : undefined;

    const regimeName =
      typeof regimeSrc?.name === "string" && regimeSrc.name.trim() ? regimeSrc.name.trim() : undefined;
    const regimeScore = toNum(regimeSrc?.score);

    const schedulerTimestamps: Array<{ label: string; iso: string }> = [];
    const pushTimestamp = (label: string, value: unknown) => {
      if (typeof value === "string" && value.trim()) {
        schedulerTimestamps.push({ label, iso: value.trim() });
      }
    };
    if (schedulerSrc && typeof schedulerSrc === "object") {
      const sched: any = schedulerSrc;
      pushTimestamp("news", sched.news_fetch_ts ?? sched.news_ts ?? sched.news_timestamp ?? sched.news?.ts);
      pushTimestamp(
        "earnings",
        sched.earnings_fetch_ts ?? sched.earnings_ts ?? sched.earnings_timestamp ?? sched.earnings?.ts
      );
      pushTimestamp(
        "macro",
        sched.macro_fetch_ts ?? sched.macro_ts ?? sched.macro_timestamp ?? sched.macro?.ts ?? macroUpdatedAt
      );
    } else if (macroUpdatedAt) {
      pushTimestamp("macro", macroUpdatedAt);
    }

    const scheduler = schedulerTimestamps.length ? schedulerTimestamps : null;

    const hasAny =
      [muPre, muPost, sigmaPre, sigmaPost, sentimentAvg7d, sentiment24h, earningsSurprise, earningsDaysSince, macroRff, macroCpi, macroURate].some(
        (v) => typeof v === "number" && Number.isFinite(v)
      ) || !!regimeName || typeof regimeScore === "number" || (scheduler?.length ?? 0) > 0;

    if (!hasAny) return null;

    return {
      muPre,
      muPost,
      sigmaPre,
      sigmaPost,
      sentiment:
        typeof sentimentAvg7d === "number" || typeof sentiment24h === "number"
          ? { avg7d: sentimentAvg7d ?? null, last24h: sentiment24h ?? null, delta: sentimentDelta }
          : null,
      earnings:
        typeof earningsSurprise === "number" || typeof earningsDaysSince === "number"
          ? { surprise: earningsSurprise ?? null, daysSince: earningsDaysSince ?? null }
          : null,
      macro:
        typeof macroRff === "number" || typeof macroCpi === "number" || typeof macroURate === "number"
          ? { rff: macroRff ?? null, cpi: macroCpi ?? null, uRate: macroURate ?? null, updatedAt: macroUpdatedAt }
          : macroUpdatedAt
            ? { rff: null, cpi: null, uRate: null, updatedAt: macroUpdatedAt }
          : null,
      regime:
        regimeName || typeof regimeScore === "number"
          ? { name: regimeName ?? null, score: regimeScore ?? null }
          : null,
      scheduler,
    };
  }, [art?.diagnostics]);
  const fmtDiag = (value: number | null | undefined) =>
    typeof value === "number" && Number.isFinite(value) ? value.toFixed(3) : "-";
  const fmtDiagPercent = (value: number | null | undefined, digits = 1) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return "-";
    const scaled = Math.abs(value) <= 1 ? value * 100 : value;
    return `${scaled >= 0 ? "+" : ""}${scaled.toFixed(digits)}%`;
  };
  const fmtDiagDaysAgo = (value: number | null | undefined) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return "-";
    const rounded = Math.max(0, Math.round(value));
    if (rounded === 0) return "today";
    if (rounded === 1) return "1 day ago";
    return `${rounded} days ago`;
  };
  const fmtDiagTimestamp = (value?: string | null) => {
    if (!value || typeof value !== "string") return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString();
  };

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
    (run: { symbol: string; horizon: number; n_paths: number }) => {
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

  const trackRuns = useMemo<RunRow[]>(
    () =>
      recentRuns.map((run) => ({
        id: run.id,
        symbol: run.symbol,
        horizon: run.horizon,
        n_paths: run.n_paths,
        q50: typeof run.q50 === "number" ? run.q50 : undefined,
        probUp: typeof run.probUp === "number" ? run.probUp : undefined,
        finishedAt: run.finishedAt,
      })),
    [recentRuns]
  );

  const handleTrackRowClick = useCallback(
    (row: RunRow) => {
      loadRunConfig(row);
    },
    [loadRunConfig]
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
          .filter((r: RunSummary | null): r is RunSummary => r !== null);
        if (!cancelled && normalized.length) {
          setRecentRuns(normalized);
        }
      } catch (err: any) {
        if (!cancelled) {
          sim.throttledLog(`Recent runs error: ${err?.message || err}`);
        }
      }
    };
    fetchRecentRuns();
    return () => {
      cancelled = true;
    };
  }, [api, getAuthHeaders, setRecentRuns, sim.throttledLog]);

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

        <div className="mx-auto max-w-7xl px-6 pb-12 md:px-8">
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
              <ContextRibbon symbol={symbol} />
              <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
                <Card id="controls-card" title="Simulation Controls">
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Field label="Ticker / Symbol">
                      <TickerAutocomplete
                        value={symbol}
                        onChange={setSymbol}
                        apiKey={hasPolygonKey ? polygonKey : undefined}
                        placeholder="e.g., NVDA"
                      />
                      {!hasPolygonKey && (
                        <p className="mt-1 text-[11px] text-white/50">
                          Provide a Polygon API key to enable live ticker search suggestions.
                        </p>
                      )}
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
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <LoadingButton
                      label="Quick Sim"
                      loadingLabel={`Simulating... ${Math.round(progress)}%`}
                      loading={isSimulating}
                      onClick={() => !isSimulating && handleSimulation("quick")}
                      className="rounded-xl border border-white/20 bg-black/40 px-4 py-2 text-white transition hover:bg-white/10"
                    />
                    <LoadingButton
                      label="Deep Sim"
                      loadingLabel={`Simulating... ${Math.round(progress)}%`}
                      loading={isSimulating}
                      onClick={() => !isSimulating && handleSimulation("deep")}
                      className="rounded-xl border border-white/20 bg-black/40 px-4 py-2 text-white transition hover:bg-white/10"
                    />
                    <LoadingButton
                      label="Predict"
                      loadingLabel="Predicting..."
                      loading={isPredicting}
                      onClick={handlePredict}
                      className="rounded-xl border border-white/20 bg-black/40 px-4 py-2 text-white transition hover:bg-white/10"
                    />
                  </div>
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
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
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
                    {diagnostics && (
                      <details className="mt-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/70">
                        <summary className="cursor-pointer text-sm font-semibold text-white/80">
                          Diagnostics
                        </summary>
                        <div className="mt-2 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">mu</span>
                            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 font-mono text-white/80">
                              <span>pre {fmtDiag(diagnostics.muPre)}</span>
                              <span className="text-white/60">post {fmtDiag(diagnostics.muPost)}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">sigma</span>
                            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 font-mono text-white/80">
                              <span>pre {fmtDiag(diagnostics.sigmaPre)}</span>
                              <span className="text-white/60">post {fmtDiag(diagnostics.sigmaPost)}</span>
                            </div>
                          </div>
                          {diagnostics.regime && (
                            <div className="flex flex-wrap items-center gap-2 text-white/70">
                              <span className="text-white/60">Regime</span>
                              <span className="rounded-full border border-white/15 px-2 py-0.5">
                                {diagnostics.regime.name ?? "-"}
                              </span>
                              {typeof diagnostics.regime.score === "number" && (
                                <span className="rounded-full bg-white/10 px-2 py-0.5">
                                  {fmtDiagPercent(diagnostics.regime.score, 0)}
                                </span>
                              )}
                            </div>
                          )}
                          {diagnostics.sentiment && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-white/60">Sentiment</span>
                              {typeof diagnostics.sentiment.avg7d === "number" && (
                                <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-emerald-200">
                                  7d {fmtDiagPercent(diagnostics.sentiment.avg7d)}
                                </span>
                              )}
                              {typeof diagnostics.sentiment.last24h === "number" && (
                                <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-sky-200">
                                  24h {fmtDiagPercent(diagnostics.sentiment.last24h)}
                                </span>
                              )}
                              {typeof diagnostics.sentiment.delta === "number" && (
                                <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/70">
                                  delta {fmtDiagPercent(diagnostics.sentiment.delta)}
                                </span>
                              )}
                            </div>
                          )}
                          {diagnostics.earnings && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-white/60">Earnings</span>
                              {typeof diagnostics.earnings.surprise === "number" && (
                                <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/70">
                                  surprise {fmtDiagPercent(diagnostics.earnings.surprise)}
                                </span>
                              )}
                              {typeof diagnostics.earnings.daysSince === "number" && (
                                <span className="rounded-full border border-white/15 px-2 py-0.5 text-white/70">
                                  {fmtDiagDaysAgo(diagnostics.earnings.daysSince)}
                                </span>
                              )}
                            </div>
                          )}
                          {diagnostics.macro && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-white/60">Macro</span>
                              {typeof diagnostics.macro.rff === "number" && (
                                <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/70">
                                  RFF {fmtDiagPercent(diagnostics.macro.rff, 2)}
                                </span>
                              )}
                              {typeof diagnostics.macro.cpi === "number" && (
                                <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/70">
                                  CPI {fmtDiagPercent(diagnostics.macro.cpi, 1)}
                                </span>
                              )}
                              {typeof diagnostics.macro.uRate === "number" && (
                                <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/70">
                                  U {fmtDiagPercent(diagnostics.macro.uRate, 1)}
                                </span>
                              )}
                              {diagnostics.macro.updatedAt && (
                                <span className="rounded-full border border-white/15 px-2 py-0.5 text-white/60">
                                  {fmtDiagTimestamp(diagnostics.macro.updatedAt) ?? diagnostics.macro.updatedAt}
                                </span>
                              )}
                            </div>
                          )}
                          {diagnostics.scheduler && diagnostics.scheduler.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 text-white/60">
                              <span className="text-white/60">Scheduler</span>
                              {diagnostics.scheduler.map((entry) => (
                                <span
                                  key={`${entry.label}-${entry.iso}`}
                                  className="rounded-full border border-white/15 px-2 py-0.5"
                                >
                                  {entry.label}: {fmtDiagTimestamp(entry.iso) ?? entry.iso}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>
                    )}
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
                    <SimSummaryCard apiBase={API_BASE} runId={runId} headers={authHeaders} />
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
                <TrackRecordPanel runs={trackRuns} onRowClick={handleTrackRowClick} />
              </EB>
            </section>

            <section id="recent-runs">
              <EB>
                <RightRail recent={rightRailItems} className="md:w-full" />
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
