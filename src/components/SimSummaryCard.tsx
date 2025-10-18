// ==========================
// File: src/components/SimSummaryCard.tsx
// ==========================
import * as React from "react";
import { useSimetrixClient } from "@/dashboard/DashboardProvider";
import type { SimMode } from "@/types/simulation";

type SummaryResponse = {
  run_id: string;
  symbol?: string;
  horizon_days?: number;
  summary: string;
  risk?: string;
  watch?: string[];
  metrics?: {
    prob_up_end?: number; // 0..1
    median_return_pct?: number; // %
    p80_low?: number;
    p80_high?: number;
    p95_low?: number;
    p95_high?: number;
    var95?: number;
    es95?: number;
  };
  // any extra fields are ignored
};

type Props = {
  runId: string; // required once you have a run
  maxRetries?: number; // default 10
  retryMsBase?: number; // default 500
  profile?: SimMode | "quick" | "deep";
};

export default function SimSummaryCard({
  runId,
  maxRetries = 10,
  retryMsBase = 500,
  profile = "quick",
}: Props) {
  const client = useSimetrixClient();
  const [data, setData] = React.useState<SummaryResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [attempt, setAttempt] = React.useState<number>(0);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);

  const buildPath = React.useCallback(
    (force: boolean) => {
      const base = force ? `/runs/${runId}/summary?refresh=1` : `/runs/${runId}/summary`;
      const joiner = base.includes("?") ? "&" : "?";
      return `${base}${joiner}profile=${encodeURIComponent(profile ?? "quick")}`;
    },
    [runId, profile]
  );

  React.useEffect(() => {
    setAttempt(0);
    setData(null);
    setError(null);
  }, [runId, profile]);

  // Fetch (with pending handling + backoff)
  React.useEffect(() => {
    if (!runId) return;
    let cancelled = false;

    async function go(force = false) {
      try {
        setLoading(true);
        setError(null);
        const path = buildPath(force);
        const r = await client.request(path);
        // treat "not ready yet" as pending
        if ([202, 404, 425].includes(r.status)) {
          if (attempt < maxRetries && !cancelled) {
            const delay = Math.min(3000, retryMsBase + attempt * 400);
            setTimeout(() => !cancelled && setAttempt((a) => a + 1), delay);
          }
          return;
        }
        if (!r.ok) {
          const txt = await safeText(r);
          throw new Error(`HTTP ${r.status} ${txt || ""}`.trim());
        }
        const js = (await r.json()) as SummaryResponse;
        if (!cancelled) {
          setData(js);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || String(e));
          setLoading(false);
        }
      }
    }

    go(false);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, runId, attempt, maxRetries, retryMsBase, buildPath]);

  // Manual refresh (forces recompute on the backend if supported)
  const handleRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      setAttempt(0);
      setData(null);
      setError(null);
      const r = await client.request(buildPath(true));
      if (!r.ok && ![202, 404, 425].includes(r.status)) {
        const txt = await safeText(r);
        throw new Error(`HTTP ${r.status} ${txt || ""}`.trim());
      }
      // if it’s pending, our effect loop will retry
      setAttempt((a) => a + 1);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setRefreshing(false);
    }
  }, [client, runId, buildPath]);

  // Placeholder while pending / no data
  if (loading || !data) {
    return (
      <div className="p-4 rounded-xl border border-white/10 bg-white/5 text-sm opacity-60">
        Powered by xAI.
      </div>
    );
  }
  return (
    <section className="p-4 rounded-xl border border-white/10 bg-white/5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/70">LLM Summary</div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-xs text-white/60 hover:text-white transition disabled:opacity-40"
          title="Recompute summary"
        >
          {refreshing ? "Refreshing…" : "Rephrase"}
        </button>
      </div>

      {/* Plain-English narrative */}
      <div className="mt-1 text-sm">{data.summary}</div>

      {/* Optional risk line */}
      {data.risk && (
        <div className="mt-3 text-xs text-white/80">
          <span className="font-semibold">What could change this:</span> {data.risk}
        </div>
      )}

      {/* Short watch list */}
      {Array.isArray(data.watch) && data.watch.length > 0 && (
        <ul className="mt-2 text-xs list-disc pl-5 text-white/80">
          {data.watch.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      {/* Collapsible numeric details */}
      {data.metrics && (
        <details className="mt-3">
          <summary className="text-xs text-white/70 cursor-pointer">Details</summary>
          <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-white/80">
            <div>P(up): {Math.round((data?.metrics?.prob_up_end ?? 0) * 100)}%</div>
            <div>Median: {Math.round(data?.metrics?.median_return_pct ?? 0)}%</div>
            <div>
              P80: {fmt(data?.metrics?.p80_low)} → {fmt(data?.metrics?.p80_high)}
            </div>
            <div>
              P95: {fmt(data?.metrics?.p95_low)} → {fmt(data?.metrics?.p95_high)}
            </div>
          </div>
        </details>
      )}

      {/* Error (soft) */}
      {error && <div className="mt-2 text-[11px] text-rose-400/80">{error}</div>}
    </section>
  );
}

// --- helpers ---
async function safeText(r: Response) {
  try {
    return await r.text();
  } catch {
    return "";
  }
}
function fmt(n?: number) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  // No currency symbol; leave formatting simple (caller knows the asset)
  return n.toFixed(4);
}
