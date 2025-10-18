import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { throttle } from "@/utils/throttle";
import type {
  MCArtifact,
  RunSummary,
  SimMode,
  SimRequestPayload,
} from "@/types/simulation";
import type { SimetrixClient } from "@/api/simetrixClient";
import { resolveApiKey } from "@/utils/apiConfig";

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

type TelemetryLevel = "info" | "warning" | "error";
type TelemetryPhase =
  | "train"
  | "predict"
  | "simulate"
  | "stream"
  | "status"
  | "artifact"
  | "summary";

type JobTelemetryEvent = {
  phase: TelemetryPhase;
  level: TelemetryLevel;
  message: string;
  detail?: Record<string, unknown>;
  runId?: string | null;
  symbol?: string;
};

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
  const [runProfile, setRunProfile] = useState<SimMode | null>(null);
  const [recentRuns, setRecentRuns] = useState<RunSummary[]>([]);

  const sseAbortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef<string | null>(null);
  const runProfileRef = useRef<SimMode | null>(null);

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

  useEffect(() => {
    runIdRef.current = runId;
  }, [runId]);

  useEffect(() => {
    runProfileRef.current = runProfile ?? null;
  }, [runProfile]);

  const sendTelemetry = useCallback(
    (event: JobTelemetryEvent) => {
      const payload = {
        ...event,
        runId: event.runId ?? runIdRef.current ?? undefined,
        timestamp: new Date().toISOString(),
      };
      client
        .postJson("/telemetry/events", payload)
        .catch((err) => {
          const logFn =
            event.level === "error"
              ? console.error
              : event.level === "warning"
              ? console.warn
              : console.log;
          logFn("[telemetry]", payload, err?.message ?? err);
        });
    },
    [client]
  );

  const recordSimulationUsage = useCallback(
    async (args: {
      runId: string;
      symbol: string;
      profile: SimMode;
      horizonDays: number;
      nPaths: number;
    }) => {
      const body = {
        run_id: args.runId,
        symbol: args.symbol.toUpperCase(),
        profile: args.profile,
        horizon_days: args.horizonDays,
        n_paths: args.nPaths,
        status: "success",
      };
      try {
        await client.postJson("/usage/simulations", body);
        sendTelemetry({
          phase: "simulate",
          level: "info",
          message: "Simulation usage recorded",
          detail: body,
          runId: args.runId,
        });
      } catch (err: any) {
        const message = err?.message ?? String(err);
        appendLog(`Quota record failed: ${message}`);
        sendTelemetry({
          phase: "simulate",
          level: "warning",
          message: "Simulation usage record failed",
          detail: { ...body, error: message },
          runId: args.runId,
        });
      }
    },
    [client, sendTelemetry, appendLog]
  );

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
        sendTelemetry({
          phase: "train",
          level: "error",
          message: error?.message || String(error),
          detail: { symbol, lookbackDays: resolvedLookback },
        });
        return false;
      } finally {
        setIsTraining(false);
      }
    },
    [client, throttledLog, sendTelemetry]
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
        sendTelemetry({
          phase: "predict",
          level: "info",
          message: "Prediction completed",
          detail: { symbol, horizonDays, probUpNext: Number.isFinite(pu) ? pu : null },
        });
      } catch (error: any) {
        throttledLog(`Error: ${error?.message || error}`);
        sendTelemetry({
          phase: "predict",
          level: "error",
          message: error?.message || String(error),
          detail: { symbol, horizonDays },
        });
      } finally {
        setIsPredicting(false);
      }
    },
    [client, throttledLog, sendTelemetry]
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
      setRunProfile(null);
      runProfileRef.current = null;

      const profile: SimMode = mode === "deep" ? "deep" : "quick";

      try {
        const lookbackDays =
          profile === "deep" ? DEEP_LOOKBACK_DAYS : QUICK_LOOKBACK_DAYS;
        const trained = await trainModel({
          symbol,
          lookbackDays,
          label:
            profile === "deep"
              ? `${symbol.toUpperCase()}: deep training (${lookbackDays}d history)`
              : `${symbol.toUpperCase()}: quick warm-up (${lookbackDays}d history)`,
        });
        if (!trained) {
          throttledLog("Simulation aborted because training failed.");
          sendTelemetry({
            phase: "train",
            level: "error",
            message: "Simulation aborted because training failed.",
            detail: { symbol, mode: profile, profile, lookbackDays },
          });
          setIsSimulating(false);
          return;
        }

        const payload: (SimRequestPayload & { x_handles?: string }) = {
          mode: profile,
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
        runIdRef.current = run_id;
        setRunProfile(profile);
        runProfileRef.current = profile;
        throttledLog(`Queued run_id: ${run_id} [${mode.toUpperCase()}]`);
        sendTelemetry({
          phase: "simulate",
          level: "info",
          message: "Simulation queued",
          detail: { mode: profile, profile, symbol, horizonDays, nPaths: boundedPaths },
          runId: run_id,
        });

        abortStream();
        sseAbortRef.current = new AbortController();
        let streamFailureMessage: string | null = null;
        try {
        const apiKeyForStream = resolveApiKey();
        const streamParams = new URLSearchParams({ profile });
        if (apiKeyForStream) {
          streamParams.append("api_key", apiKeyForStream);
        }
        const streamQuery = streamParams.toString();
        const streamPath = `/simulate/${run_id}/stream${streamQuery ? `?${streamQuery}` : ""}`;
        await fetchEventSource(client.resolvePath(streamPath), {
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
                  if (!streamFailureMessage && data.status.toLowerCase() === "error") {
                    streamFailureMessage = data.detail.trim();
                  }
                  parts.push(`Detail: ${data.detail.trim()}`);
                }
                if (typeof data.error === "string" && data.error.trim()) {
                  if (!streamFailureMessage) {
                    streamFailureMessage = data.error.trim();
                  }
                  parts.push(`Error: ${data.error.trim()}`);
                }
                throttledLog(parts.join(" | "));
              } else if (typeof data.detail === "string" && data.detail.trim()) {
                throttledLog(`Detail: ${data.detail.trim()}`);
              } else if (typeof data.error === "string" && data.error.trim()) {
                if (!streamFailureMessage) {
                  streamFailureMessage = data.error.trim();
                }
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
            if (!streamFailureMessage) {
              streamFailureMessage = error?.message || String(error);
            }
            sendTelemetry({
              phase: "stream",
              level: "error",
              message: error?.message || String(error),
              detail: { runId: run_id, mode: profile, profile },
              runId: run_id,
            });
            abortStream();
          },
          onclose: () => throttledLog("Stream closed."),
        });
        } catch (error: any) {
          throttledLog(`Stream failed: ${error?.message || error}. Continuing...`);
          if (!streamFailureMessage) {
            streamFailureMessage = error?.message || String(error);
          }
          sendTelemetry({
            phase: "stream",
            level: "error",
            message: error?.message || String(error),
            detail: { runId: run_id, mode: profile, profile },
            runId: run_id,
          });
        } finally {
          abortStream();
        }
        if (streamFailureMessage) {
          throw new Error(streamFailureMessage);
        }

        const fetchArtifactWithRetry = async (timeoutMs = 20000): Promise<MCArtifact> => {
          const startedAt = Date.now();
          let attempt = 0;
          const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
          const pendingStatuses = new Set([202, 403, 404]);
          while (true) {
            const resp = await client.request(
              `/simulate/${run_id}/artifact?profile=${encodeURIComponent(profile)}`
            );
            const artTxt = await safeText(resp);
            if (pendingStatuses.has(resp.status)) {
              throttledLog(
                resp.status === 202
                  ? "Artifact pending... waiting a moment."
                  : `Artifact not ready yet (HTTP ${resp.status}); retrying...`
              );
            } else if (!resp.ok) {
              if (looksLikeHTML(artTxt)) throw new Error("Misrouted to HTML. Check VITE_API_BASE and CORS.");
              sendTelemetry({
                phase: "artifact",
                level: "error",
                message: `Artifact fetch failed: ${resp.status}`,
                detail: {
                  status: resp.status,
                  body: artTxt?.slice(0, 200),
                  profile,
                },
                runId: run_id,
              });
              throw new Error(`Artifact fetch failed: ${resp.status} - ${artTxt}`);
            } else {
              if (looksLikeHTML(artTxt)) {
                throw new Error("Misrouted to HTML. Check VITE_API_BASE and CORS.");
              }
              let parsed: unknown = null;
              if (artTxt) {
                try {
                  parsed = JSON.parse(artTxt);
                } catch {
                  throttledLog("Artifact parse error; retrying...");
                  sendTelemetry({
                    phase: "artifact",
                    level: "warning",
                    message: "Artifact parse error",
                    detail: { attempt, runId: run_id, profile },
                    runId: run_id,
                  });
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
              sendTelemetry({
                phase: "artifact",
                level: "error",
                message: "Timed out waiting for artifact",
                detail: { attempt, runId: run_id, profile },
                runId: run_id,
              });
              throw new Error("Timed out waiting for artifact");
            }
            attempt += 1;
            await sleep(Math.min(1500, 250 + attempt * 250));
          }
        };

        try {
          const statusResp = await client.request(
            `/simulate/${run_id}/status?profile=${encodeURIComponent(profile)}`
          );
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
              sendTelemetry({
                phase: "status",
                level: "warning",
                message: "Status parse error",
                detail: {
                  error: parseErr instanceof Error ? parseErr.message : String(parseErr),
                  profile,
                },
                runId: run_id,
              });
            }
          } else if (!statusResp.ok) {
            throttledLog(
              `Status check failed: ${statusResp.status} - ${statusTxt || "no body"}`
            );
            sendTelemetry({
              phase: "status",
              level: "error",
              message: "Status endpoint failed",
              detail: {
                status: statusResp.status,
                body: statusTxt || null,
                profile,
              },
              runId: run_id,
            });
          }
        } catch (statusErr: any) {
          throttledLog(`Status check failed: ${statusErr?.message || statusErr}`);
          sendTelemetry({
            phase: "status",
            level: "error",
            message: statusErr?.message || String(statusErr),
            detail: { profile },
            runId: run_id,
          });
        }

        const artifact = await fetchArtifactWithRetry();
        setArt(artifact);
        setDrivers(artifact.drivers || []);
        setProbUp(artifact.prob_up_end || 0);
        setCurrentPrice(
          (artifact as any).spot ?? artifact.median_path?.[0]?.[1] ?? null
        );
        const puNextCandidate =
          (artifact as any)?.fan_chart?.prob_up_next ??
          (artifact as any)?.prob_up_next ??
          (artifact as any)?.probUpNext;
        const puNext = Number(puNextCandidate);
        if (Number.isFinite(puNext)) setProbUpNext(puNext);
        throttledLog(
          `Artifact loaded for run ${run_id}. median_path=${artifact?.median_path?.length ?? 0} pts`
        );
        sendTelemetry({
          phase: "artifact",
          level: "info",
          message: "Artifact loaded",
          detail: {
            medianCount: artifact?.median_path?.length ?? 0,
            symbol,
            profile,
          },
          runId: run_id,
        });
        if (artifact && run_id) {
          client
            .request(`/runs/${run_id}/summary?profile=${encodeURIComponent(profile)}`)
            .catch((summaryErr) => {
              sendTelemetry({
                phase: "summary",
                level: "warning",
                message: summaryErr?.message || String(summaryErr),
                detail: { profile },
                runId: run_id,
              });
            });
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
          profile,
        };
        setRecentRuns((prev) => {
          const filtered = prev.filter((r) => r.id !== summary.id);
          return [summary, ...filtered].slice(0, 8);
        });
        await recordSimulationUsage({
          runId: run_id,
          symbol,
          profile,
          horizonDays:
            Number(artifact.horizon_days ?? horizonDays) || Number(horizonDays),
          nPaths:
            Number((artifact as any)?.n_paths ?? boundedPaths) || Number(boundedPaths),
        });
        throttledLog(`Run ${run_id} finalized.`);
        sendTelemetry({
          phase: "summary",
          level: "info",
          message: "Simulation finalized",
          detail: { symbol, mode: profile, profile, horizonDays, runId: run_id },
          runId: run_id,
        });
      } catch (error: any) {
        throttledLog(`Error: ${error?.message ?? error}`);
        sendTelemetry({
          phase: "simulate",
          level: "error",
          message: error?.message ?? String(error),
          detail: {
            symbol,
            mode: profile,
            profile,
            horizonDays,
            runId: runIdRef.current,
          },
        });
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
      sendTelemetry,
      recordSimulationUsage,
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
    runProfile,
    recentRuns,
    setRecentRuns,
    runPredict,
    runSimulation,
    throttledLog,
    abortStream,
  };
}

export type UseSimRunnerReturn = ReturnType<typeof useSimRunner>;






