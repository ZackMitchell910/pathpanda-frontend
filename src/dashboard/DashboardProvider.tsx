import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createSimetrixClient, type SimetrixClient } from "@/api/simetrixClient";
import { useSimRunner, type UseSimRunnerReturn } from "@/hooks/useSimRunner";
import type { MCArtifact } from "@/types/simulation";
import type { LadderRow } from "@/TargetsAndOdds";

type MaybeNumber = number | string | null | undefined;

type DiagnosticsSnapshot = {
  mu?: { pre?: MaybeNumber; post?: MaybeNumber } | null;
  sigma?: { pre?: MaybeNumber; post?: MaybeNumber } | null;
  mu_pre?: MaybeNumber;
  mu_post?: MaybeNumber;
  sigma_pre?: MaybeNumber;
  sigma_post?: MaybeNumber;
  sentiment?: Record<string, unknown> | null;
  earnings?: Record<string, unknown> | null;
  macro?: Record<string, unknown> | null;
  regime?: Record<string, unknown> | null;
  scheduler?: Record<string, unknown> | null;
  context?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type Diagnostics = {
  muPre: number | null;
  muPost: number | null;
  sigmaPre: number | null;
  sigmaPost: number | null;
  sentiment?: {
    avg7d: number | null;
    last24h: number | null;
    delta: number | null;
  } | null;
  earnings?: {
    surprise: number | null;
    daysSince: number | null;
  } | null;
  macro?: {
    rff: number | null;
    cpi: number | null;
    uRate: number | null;
    updatedAt?: string;
  } | null;
  regime?: {
    name?: string;
    score?: number | null;
  } | null;
  scheduler?: Array<{ label: string; iso: string }>;
};

type DashboardDerived = {
  artifact: MCArtifact | null;
  drivers: { feature: string; weight: number }[];
  probUp: number;
  probUpNext: number | null;
  currentPrice: number | null;
  s0FromArt: number | null;
  kpiMedianDeltaPct: number | null;
  ladderRows: LadderRow[];
  diagnostics: Diagnostics | null;
};

type DashboardOverrides = {
  artifact: MCArtifact | null;
  drivers: { feature: string; weight: number }[] | null;
  probUp: number | null;
  currentPrice: number | null;
  setArtifact: React.Dispatch<React.SetStateAction<MCArtifact | null>>;
  setDrivers: React.Dispatch<
    React.SetStateAction<{ feature: string; weight: number }[] | null>
  >;
  setProbUp: React.Dispatch<React.SetStateAction<number | null>>;
  setCurrentPrice: React.Dispatch<React.SetStateAction<number | null>>;
  clear: () => void;
};

type DashboardContextValue = {
  sim: UseSimRunnerReturn;
  api: (path: string) => string;
  getAuthHeaders: () => Record<string, string>;
  client: SimetrixClient;
  derived: DashboardDerived;
  overrides: DashboardOverrides;
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
  const [artifactOverride, setArtifactOverride] = useState<MCArtifact | null>(null);
  const [driversOverride, setDriversOverride] = useState<
    { feature: string; weight: number }[] | null
  >(null);
  const [probUpOverride, setProbUpOverride] = useState<number | null>(null);
  const [currentPriceOverride, setCurrentPriceOverride] = useState<number | null>(null);

  const clearOverrides = useCallback(() => {
    setArtifactOverride(null);
    setDriversOverride(null);
    setProbUpOverride(null);
    setCurrentPriceOverride(null);
  }, []);

  useEffect(() => {
    if (sim.art) {
      clearOverrides();
    }
  }, [sim.art, clearOverrides]);

  useEffect(() => {
    if (!sim.runId || sim.art) return;
    let cancelled = false;
    const hydrate = async () => {
      try {
        const artifact = await fetchArtifactWithRetry(
          client,
          sim.runId!,
          sim.throttledLog
        );
        if (cancelled) return;
        setArtifactOverride(artifact);
        setDriversOverride(
          Array.isArray(artifact?.drivers) ? artifact.drivers : null
        );
        const prob = artifact?.prob_up_end;
        setProbUpOverride(
          typeof prob === "number" && Number.isFinite(prob) ? prob : null
        );
        setCurrentPriceOverride(extractSpotFromArtifact(artifact));
      } catch (error) {
        if (!cancelled) {
          sim.throttledLog(
            `Artifact fetch retry failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [client, sim.runId, sim.art, sim.throttledLog]);

  const derived = useMemo<DashboardDerived>(() => {
    const artifact = artifactOverride ?? sim.art ?? null;
    const drivers = driversOverride ?? sim.drivers ?? [];
    const probUp =
      typeof probUpOverride === "number" && Number.isFinite(probUpOverride)
        ? probUpOverride
        : sim.probUp;
    const currentPrice =
      typeof currentPriceOverride === "number" && Number.isFinite(currentPriceOverride)
        ? currentPriceOverride
        : sim.currentPrice;
    const probUpNext = computeProbUpNext(sim.probUpNext, artifact);
    const s0FromArt = extractSpotFromArtifact(artifact);

    return {
      artifact,
      drivers,
      probUp,
      probUpNext,
      currentPrice,
      s0FromArt,
      kpiMedianDeltaPct: computeMedianDeltaPct(artifact),
      ladderRows: computeLadderRows(artifact, currentPrice),
      diagnostics: computeDiagnostics(artifact),
    };
  }, [
    artifactOverride,
    driversOverride,
    probUpOverride,
    currentPriceOverride,
    sim.art,
    sim.drivers,
    sim.probUp,
    sim.probUpNext,
    sim.currentPrice,
  ]);

  const overridesValue = useMemo<DashboardOverrides>(
    () => ({
      artifact: artifactOverride,
      drivers: driversOverride,
      probUp: probUpOverride,
      currentPrice: currentPriceOverride,
      setArtifact: setArtifactOverride,
      setDrivers: setDriversOverride,
      setProbUp: setProbUpOverride,
      setCurrentPrice: setCurrentPriceOverride,
      clear: clearOverrides,
    }),
    [
      artifactOverride,
      driversOverride,
      probUpOverride,
      currentPriceOverride,
      clearOverrides,
    ]
  );

  const value = useMemo<DashboardContextValue>(
    () => ({
      sim,
      api,
      getAuthHeaders,
      client,
      derived,
      overrides: overridesValue,
    }),
    [sim, api, getAuthHeaders, client, derived, overridesValue]
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

export function useDashboardData() {
  return useDashboard().derived;
}

export function useDashboardOverrides() {
  return useDashboard().overrides;
}

function toNumber(value: MaybeNumber): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function computeDiagnostics(artifact: MCArtifact | null): Diagnostics | null {
  const raw = (artifact?.diagnostics ?? null) as DiagnosticsSnapshot | null;
  if (!raw) return null;

  const maybeMu = (raw.mu ?? null) as Record<string, unknown> | null;
  const maybeSigma = (raw.sigma ?? null) as Record<string, unknown> | null;
  const muPre =
    toNumber(maybeMu?.pre) ??
    toNumber((raw as any)?.mu_pre) ??
    toNumber((raw as any)?.mu_before) ??
    null;
  const muPost =
    toNumber(maybeMu?.post) ??
    toNumber((raw as any)?.mu_post) ??
    toNumber((raw as any)?.mu_after) ??
    null;
  const sigmaPre =
    toNumber(maybeSigma?.pre) ??
    toNumber((raw as any)?.sigma_pre) ??
    toNumber((raw as any)?.sigma_before) ??
    null;
  const sigmaPost =
    toNumber(maybeSigma?.post) ??
    toNumber((raw as any)?.sigma_post) ??
    toNumber((raw as any)?.sigma_after) ??
    null;

  const context = (raw.context ?? {}) as Record<string, unknown>;
  const sentimentSrc = (raw.sentiment ?? context.sentiment) as
    | Record<string, unknown>
    | undefined;
  const earningsSrc = (raw.earnings ?? context.earnings) as
    | Record<string, unknown>
    | undefined;
  const macroSrc = (raw.macro ?? context.macro) as
    | Record<string, unknown>
    | undefined;
  const regimeSrc = (raw.regime ?? context.regime) as
    | Record<string, unknown>
    | undefined;
  const schedulerSrc = (raw.scheduler ?? context.scheduler) as
    | Record<string, unknown>
    | undefined;

  const sentimentAvg7d = toNumber(
    sentimentSrc?.avg_sent_7d ??
      sentimentSrc?.avg7d ??
      sentimentSrc?.avg ??
      sentimentSrc?.avg_7d
  );
  const sentiment24h = toNumber(
    sentimentSrc?.avg_sent_last24h ??
      sentimentSrc?.last24h ??
      sentimentSrc?.day ??
      sentimentSrc?.last_24h
  );
  const sentimentDelta =
    sentimentAvg7d !== null && sentiment24h !== null
      ? sentiment24h - sentimentAvg7d
      : null;

  const earningsSurprise = toNumber(
    earningsSrc?.surprise_pct ??
      earningsSrc?.surprise_percent ??
      earningsSrc?.surprise ??
      earningsSrc?.last_surprise_pct
  );
  const earningsDaysSince = toNumber(
    earningsSrc?.days_since ??
      earningsSrc?.days ??
      earningsSrc?.last_days ??
      earningsSrc?.last_event_days_ago
  );

  const macroRff = toNumber(macroSrc?.rff);
  const macroCpi = toNumber(macroSrc?.cpi_yoy ?? macroSrc?.cpi);
  const macroURate = toNumber(macroSrc?.u_rate ?? macroSrc?.unemployment);
  const macroUpdatedAt =
    typeof macroSrc?.updated_at === "string" && macroSrc.updated_at.trim()
      ? macroSrc.updated_at.trim()
      : undefined;

  const regimeName =
    typeof regimeSrc?.name === "string" && regimeSrc.name.trim()
      ? regimeSrc.name.trim()
      : undefined;
  const regimeScore = toNumber(regimeSrc?.score);

  const scheduler: Array<{ label: string; iso: string }> = [];
  const pushTimestamp = (label: string, value: unknown) => {
    if (typeof value === "string" && value.trim()) {
      scheduler.push({ label, iso: value.trim() });
    }
  };
  if (schedulerSrc && typeof schedulerSrc === "object") {
    const sched: any = schedulerSrc;
    pushTimestamp(
      "news",
      sched.news_fetch_ts ?? sched.news_ts ?? sched.news_timestamp ?? sched.news?.ts
    );
    pushTimestamp(
      "earnings",
      sched.earnings_fetch_ts ??
        sched.earnings_ts ??
        sched.earnings_timestamp ??
        sched.earnings?.ts
    );
    pushTimestamp(
      "macro",
      sched.macro_fetch_ts ?? sched.macro_ts ?? sched.macro_timestamp ?? sched.macro?.ts
    );
  }

  return {
    muPre,
    muPost,
    sigmaPre,
    sigmaPost,
    sentiment: sentimentSrc
      ? {
          avg7d: sentimentAvg7d,
          last24h: sentiment24h,
          delta: sentimentDelta,
        }
      : null,
    earnings: earningsSrc
      ? {
          surprise: earningsSurprise,
          daysSince: earningsDaysSince,
        }
      : null,
    macro: macroSrc
      ? {
          rff: macroRff,
          cpi: macroCpi,
          uRate: macroURate,
          updatedAt: macroUpdatedAt,
        }
      : null,
    regime: regimeSrc
      ? {
          name: regimeName,
          score: regimeScore,
        }
      : null,
    scheduler,
  };
}

function computeLadderRows(
  artifact: MCArtifact | null,
  currentPrice: number | null
): LadderRow[] {
  const targetLevels = artifact?.targets?.levels;
  if (Array.isArray(targetLevels) && targetLevels.length) {
    return targetLevels
      .map((lvl) => {
        const label =
          typeof lvl?.label === "string" && lvl.label.trim()
            ? lvl.label.trim()
            : `${Number(lvl?.price ?? 0).toFixed(2)}`;
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
  if (!artifact || typeof currentPrice !== "number" || !Number.isFinite(currentPrice)) {
    return [];
  }
  const rung = (price: number, label: string): LadderRow => ({
    label,
    price,
    hitEver: undefined,
    hitByEnd: undefined,
    tMedDays: undefined,
  });
  return [
    rung(currentPrice * 0.8, "-20%"),
    rung(currentPrice * 0.9, "-10%"),
    rung(currentPrice, "Spot"),
    rung(currentPrice * 1.1, "+10%"),
    rung(currentPrice * 1.2, "+20%"),
  ].map((row) => ({
    ...row,
    price: Number.isFinite(row.price) ? Number(row.price) : currentPrice,
  }));
}

function computeMedianDeltaPct(artifact: MCArtifact | null): number | null {
  if (!artifact) return null;
  const s0 = artifact.median_path?.[0]?.[1] ?? 0;
  const sH = artifact.median_path?.at(-1)?.[1] ?? 0;
  if (!s0 || !Number.isFinite(s0) || !Number.isFinite(sH)) return null;
  return (sH / s0 - 1) * 100;
}

function extractSpotFromArtifact(artifact: MCArtifact | null): number | null {
  if (!artifact) return null;
  const spot =
    (artifact as any)?.spot ??
    (artifact as any)?.inputs?.S0 ??
    (Array.isArray(artifact.median_path) ? artifact.median_path?.[0]?.[1] : null);
  return typeof spot === "number" && Number.isFinite(spot) ? spot : null;
}

function computeProbUpNext(
  simProbUpNext: number | null,
  artifact: MCArtifact | null
): number | null {
  if (typeof simProbUpNext === "number" && Number.isFinite(simProbUpNext)) {
    return simProbUpNext;
  }
  const fromArtifact =
    (artifact as any)?.prob_up_next ?? (artifact as any)?.probUpNext ?? null;
  return typeof fromArtifact === "number" && Number.isFinite(fromArtifact)
    ? fromArtifact
    : null;
}

async function fetchArtifactWithRetry(
  client: SimetrixClient,
  runId: string,
  log?: (message: string) => void,
  timeoutMs = 20000
): Promise<MCArtifact> {
  const startedAt = Date.now();
  let attempt = 0;
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  while (true) {
    attempt += 1;
    const resp = await client.request(`/simulate/${runId}/artifact`);
    const txt = await resp.text();
    if (resp.status === 202) {
      log?.("Artifact pending... waiting a moment.");
    } else if (!resp.ok) {
      throw new Error(txt || `HTTP ${resp.status}`);
    } else {
      if (!txt) {
        log?.("Artifact response empty; retrying...");
      } else {
        try {
          const parsed = JSON.parse(txt);
          const candidate = parsed as MCArtifact;
          if (
            candidate &&
            typeof candidate === "object" &&
            Array.isArray(candidate.median_path) &&
            candidate.bands &&
            Array.isArray((candidate.bands as any)?.p95_low ?? [])
          ) {
            return candidate;
          }
          log?.("Artifact response not complete yet; retrying...");
        } catch {
          log?.("Artifact parse error; retrying...");
        }
      }
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Timed out waiting for artifact");
    }
    await sleep(Math.min(1500, 250 + attempt * 250));
  }
}
