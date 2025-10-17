import { useCallback, useMemo, useRef, useState } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { throttle } from "@/utils/throttle";
import type { MCArtifact, RunSummary, SimMode } from "@/types/simulation";
import type { SimetrixClient } from "@/api/simetrixClient";

type UseSimRunnerConfig = {
  client: SimetrixClient;
};

type RunPredictArgs = {
  symbol: string;
  horizonDays: number;
};

type RunSimulationArgs = {
  mode: SimMode;
  symbol: string;
  horizonDays: number;
  nPaths: number;
  includeNews: boolean;
  includeOptions: boolean;
  includeFutures: boolean;
  xHandles?: string;
};

type TrainOptions = {
  symbol: string;
  lookbackDays?: number;
  label?: string;
};

const QUICK_LOOKBACK_DAYS = 180;
const DEEP_LOOKBACK_DAYS = 3650;

const clampLookback = (days: number) => {
  const d = Math.floor(Number(days));
  if (!Number.isFinite(d) || d <= 0) return DEEP_LOOKBACK_DAYS;
  return Math.max(30, Math.min(d, DEEP_LOOKBACK_DAYS));
};

async function safeText(resp: Response) {
  try {
    return await resp.text();
  } catch {
    return "<no body>";
  }
}

function looksLikeHTML(body: string) {
  return /^\s*<!doctype html>|<html/i.test(body);
}

export function useSimRunner({ client }: UseSimRunnerConfig) {
  const [isTraining, setIsTraining] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [drivers, setDrivers] = useState<{ feature: string; weight: number }[]>([]);
  const [probUp, setProbUp] = useState(0);
  const [probUpNext, setProbUpNext] = useState<number | null>(null);
  const [art, setArt] = useState<MCArtifact | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [recentRuns, setRecentRuns] = useState<RunSummary[]>([]);

  const sseAbortRef = useRef<AbortController | null>(null);

  const appendLog = useCallback((message: string) => {
    setLogMessages((prev) => {
      if (!message) return prev;
      if (prev[prev.length - 1] === message) return prev;
      if (prev.length >= 50) {
        return [...prev.slice(1), message];
      }
      return [...prev, message];
    });
  }, []);

  const throttledLog = useMemo(
    () => throttle((m: string) => appendLog(m), 120),
    [appendLog]
  );
  const throttledProgress = useMemo(
    () => throttle((value: number) => setProgress(value), 100),
    []
  );

  const abortStream = useCallback(() => {
    try {
      sseAbortRef.current?.abort();
    } catch {
      // ignore
    }
    sseAbortRef.current = null;
  }, []);

  const trainModel = useCallback(
    async ({ symbol, lookbackDays, label }: TrainOptions) => {
      const resolvedLookback = clampLookback(lookbackDays ?? DEEP_LOOKBACK_DAYS);
      const actionLabel =
        label ?? `${symbol.toUpperCase()}: training (${resolvedLookback}d history)`;
      setIsTraining(true);
      throttledLog(`${actionLabel}...`);
      try {
        const resp = await client.request("/train", {
          method: "POST",
          body: JSON.stringify({
            symbol: symbol.toUpperCase(),
            lookback_days: resolvedLookback,
          }),
        });
        const text = await safeText(resp);
        if (!resp.ok) {
          if (looksLikeHTML(text)) throw new Error("Misrouted to HTML. Check API base.");
          throw new Error(`Train failed: ${resp.status} - ${text}`);
        }
        throttledLog(`${actionLabel} complete.`);
        return true;
      } catch (error: any) {
        throttledLog(`Training error: ${error?.message || error}`);
        return false;
      } finally {
        setIsTraining(false);
      }
    },
    [client, throttledLog]
  );

  const runPredict = useCallback(
    async ({ symbol, horizonDays }: RunPredictArgs) => {
      if (!Number.isFinite(horizonDays) || horizonDays < 1) {
        throttledLog("Error: Please enter a horizon (days).");
        return;
      }
      if (horizonDays > 365) {
        throttledLog("Error: Predict horizon must be <= 365 days.");
        return;
      }
      throttledLog(`Running prediction... [${symbol.toUpperCase()} H${horizonDays}]`);
      setIsPredicting(true);
      try {
        const resp = await client.request("/predict", {
          method: "POST",
          body: JSON.stringify({
            symbol: symbol.toUpperCase(),
            horizon_days: horizonDays,
          }),
        });
        const text = await safeText(resp);
        if (!resp.ok) {
          if (looksLikeHTML(text)) throw new Error("Misrouted to HTML. Check API base.");
          throw new Error(`Predict failed: ${resp.status} - ${text}`);
        }
        const payload = JSON.parse(text);
        const pu = Number(payload?.prob_up_next);
        if (Number.isFinite(pu)) setProbUpNext(pu);
        throttledLog(
          `Prediction: Prob Up Next = ${
            Number.isFinite(pu) ? (pu * 100).toFixed(2) : "?"
          }%`
        );
      } catch (error: any) {
        throttledLog(`Error: ${error?.message || error}`);
      } finally {
        setIsPredicting(false);
      }
    },
    [client, throttledLog]
  );

  const runSimulation = useCallback(
    async ({
      mode,
      symbol,
      horizonDays,
      nPaths,
      includeNews,
      includeOptions,
      includeFutures,
      xHandles,
    }: RunSimulationArgs) => {
      if (!Number.isFinite(horizonDays) || horizonDays < 1) {
        throttledLog("Error: Please enter a horizon (days).");
        return;
      }
      if (horizonDays > 3650) {
        throttledLog("Error: Horizon must be <= 3650 days (10 years).");
        return;
      }
      const boundedPaths = Math.max(100, Math.min(Number(nPaths) || 2000, 10000));
      if (isTraining) {
        throttledLog(
          "Training already in progress. Please wait for it to finish before running a simulation."
        );
        return;
      }

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
        const lookbackDays =
          mode === "deep" ? DEEP_LOOKBACK_DAYS : QUICK_LOOKBACK_DAYS;
        const trained = await trainModel({
          symbol,
          lookbackDays,
          label:
            mode === "deep"
              ? `${symbol.toUpperCase()}: deep training (${lookbackDays}d history)`
              : `${symbol.toUpperCase()}: quick warm-up (${lookbackDays}d history)`,
        });
        if (!trained) {
          throttledLog("Simulation aborted because training failed.");
          setIsSimulating(false);
          return;
        }

        const payload: Record<string, unknown> = {
          mode,
          symbol: symbol.toUpperCase(),
          horizon_days: Number(horizonDays),
          n_paths: Number(boundedPaths),
          timespan: "day",
          include_news: !!includeNews,
          include_options: !!includeOptions,
          include_futures: !!includeFutures,
        };
        if (xHandles && xHandles.trim()) {
          payload.x_handles = xHandles.trim();
        }

        const start = await client.request("/simulate", {
          method: "POST",
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

        abortStream();
        sseAbortRef.current = new AbortController();
        try {
        await fetchEventSource(client.resolvePath(`/simulate/${run_id}/stream`), {
          headers: client.getHeaders(),
          signal: sseAbortRef.current.signal,
          openWhenHidden: true,
          fetch: (input, init) => {
            const url =
              typeof input === "string" || input instanceof URL
                ? input
                : input instanceof Request
                ? input.url
                : String(input);
            return client.request(url, init ?? {});
          },
          onopen: async (response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            throttledLog("Connected to stream");
          },
          onmessage: (event) => {
            try {
              const data = JSON.parse(event.data);
              if (typeof data.status === "string") {
                const prog = typeof data.progress === "number" ? data.progress : 0;
                throttledProgress(prog);
                const parts = [
                  `Status: ${data.status}`,
                  `Progress: ${Math.round(prog)}%`,
                ];
                if (typeof data.detail === "string" && data.detail.trim()) {
                  parts.push(`Detail: ${data.detail.trim()}`);
                }
                if (typeof data.error === "string" && data.error.trim()) {
                  parts.push(`Error: ${data.error.trim()}`);
                }
                throttledLog(parts.join(" | "));
              } else if (typeof data.detail === "string" && data.detail.trim()) {
                throttledLog(`Detail: ${data.detail.trim()}`);
              } else if (typeof data.error === "string" && data.error.trim()) {
                throttledLog(`Error: ${data.error.trim()}`);
              }
            } catch {
              // ignore parse errors
            }
          },
          onerror: (error) => {
            throttledLog(
              `Stream error: ${error?.message || error}. Ending stream...`
            );
            abortStream();
          },
          onclose: () => throttledLog("Stream closed."),
        });
        } catch (error: any) {
          throttledLog(`Stream failed: ${error?.message || error}. Continuing...`);
        } finally {
          abortStream();
        }

        const fetchArtifactWithRetry = async (timeoutMs = 20000): Promise<MCArtifact> => {
          const startedAt = Date.now();
          let attempt = 0;
          const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
          while (true) {
            const resp = await client.request(`/simulate/${run_id}/artifact`);
            const artTxt = await safeText(resp);
            if (resp.status === 202) {
              throttledLog("Artifact pending... waiting a moment.");
            } else if (!resp.ok) {
              if (looksLikeHTML(artTxt)) throw new Error("Misrouted to HTML. Check API base.");
              throw new Error(`Artifact fetch failed: ${resp.status} - ${artTxt}`);
            } else {
              let parsed: unknown = null;
              if (artTxt) {
                try {
                  parsed = JSON.parse(artTxt);
                } catch {
                  throttledLog("Artifact parse error; retrying...");
                }
              }
              const candidate = parsed as MCArtifact | null;
              if (
                candidate &&
                typeof candidate === "object" &&
                Array.isArray(candidate.median_path) &&
                candidate.bands &&
                Array.isArray((candidate.bands as any)?.p50)
              ) {
                return candidate;
              }
              throttledLog("Artifact response not complete yet; retrying...");
            }
            if (Date.now() - startedAt > timeoutMs) {
              throw new Error("Timed out waiting for artifact");
            }
            attempt += 1;
            await sleep(Math.min(1500, 250 + attempt * 250));
          }
        };

        try {
        const statusResp = await client.request(`/simulate/${run_id}/status`);
          const statusTxt = await safeText(statusResp);
          if (statusResp.ok && statusTxt) {
            try {
              const statusJson = JSON.parse(statusTxt);
              const detailStr =
                typeof statusJson?.detail === "string"
                  ? statusJson.detail.trim()
                  : "";
              const errorStr =
                typeof statusJson?.error === "string"
                  ? statusJson.error.trim()
                  : "";
              if (detailStr) throttledLog(`Detail: ${detailStr}`);
              if (errorStr) throttledLog(`Error: ${errorStr}`);
            } catch (parseErr: any) {
              throttledLog(
                `Status parse error: ${
                  parseErr instanceof Error ? parseErr.message : String(parseErr)
                }`
              );
            }
          } else if (!statusResp.ok) {
            throttledLog(
              `Status check failed: ${statusResp.status} - ${statusTxt || "no body"}`
            );
          }
        } catch (statusErr: any) {
          throttledLog(`Status check failed: ${statusErr?.message || statusErr}`);
        }

        const artifact = await fetchArtifactWithRetry();
        setArt(artifact);
        setDrivers(artifact.drivers || []);
        setProbUp(artifact.prob_up_end || 0);
        setCurrentPrice(
          (artifact as any).spot ?? artifact.median_path?.[0]?.[1] ?? null
        );
        const puNext = Number((artifact as any)?.prob_up_next);
        if (Number.isFinite(puNext)) setProbUpNext(puNext);
        throttledLog(
          `Artifact loaded for run ${run_id}. median_path=${artifact?.median_path?.length ?? 0} pts`
        );
        try {
          if (artifact && run_id) {
            client.request(`/runs/${run_id}/summary`).catch(() => {});
          }
        } catch {
          // ignore
        }

        const terminalPoint =
          Array.isArray(artifact.median_path) && artifact.median_path.length
            ? artifact.median_path[artifact.median_path.length - 1]?.[1]
            : null;
        const summary: RunSummary = {
          id: run_id,
          symbol: artifact.symbol || symbol.toUpperCase(),
          horizon: Number(artifact.horizon_days ?? horizonDays) || Number(horizonDays),
          n_paths:
            Number((artifact as any)?.n_paths ?? boundedPaths) || Number(boundedPaths),
          finishedAt: new Date().toISOString(),
          probUp:
            typeof artifact.prob_up_end === "number" ? artifact.prob_up_end : null,
          q50:
            typeof terminalPoint === "number" && Number.isFinite(terminalPoint)
              ? terminalPoint
              : null,
        };
        setRecentRuns((prev) => {
          const filtered = prev.filter((r) => r.id !== summary.id);
          return [summary, ...filtered].slice(0, 8);
        });
        throttledLog(`Run ${run_id} finalized.`);
      } catch (error: any) {
        throttledLog(`Error: ${error?.message ?? error}`);
      } finally {
        setIsSimulating(false);
      }
    },
    [
      abortStream,
      isTraining,
      trainModel,
      throttledLog,
      throttledProgress,
      client,
    ]
  );

  return {
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
    throttledLog,
    abortStream,
  };
}

export type UseSimRunnerReturn = ReturnType<typeof useSimRunner>;





