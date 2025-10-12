import * as React from "react";

type SummaryResponse = {
  run_id: string;
  symbol?: string;
  horizon_days?: number;
  summary: string;
  risk?: string;
  watch?: string[];
  metrics?: {
    prob_up_end?: number;            // 0..1
    median_return_pct?: number;      // %
    p80_low?: number;  p80_high?: number;
    p95_low?: number;  p95_high?: number;
    var95?: number;    es95?: number;
  };
  // any extra fields are ignored
};

type Props = {
  apiBase: string;
  runId: string;                     // required once you have a run
  headers?: HeadersInit;             // pass if your endpoint is protected
  maxRetries?: number;               // default 10
  retryMsBase?: number;              // default 500
};

export default function SimSummaryCard({
  apiBase,
  runId,
  headers,
  maxRetries = 10,
  retryMsBase = 500,
}: Props) {
  const [data, setData] = React.useState<SummaryResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [attempt, setAttempt] = React.useState<number>(0);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);

  // Fetch (with pending handling + backoff)
  React.useEffect(() => {
    if (!runId) return;
    let cancelled = false;

    async function go(force = false) {
      try {
        setLoading(true);
        setError(null);
        const url = force ? `${apiBase}/runs/${runId}/summary?refresh=1`
                          : `${apiBase}/runs/${runId}/summary`;
        const r = await fetch(url, { headers });
        // treat "not ready yet" as pending
        if ([202, 404, 425].includes(r.status)) {
          if (attempt < maxRetries && !cancelled) {
            const delay = Math.min(3000, retryMsBase + attempt * 400);
            setTimeout(() => !cancelled && setAttempt(a => a + 1), delay);
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
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, runId, headers, attempt, maxRetries, retryMsBase]);

  // Manual refresh (forces recompute on the backend if supported)
  const handleRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      setAttempt(0);
      setData(null);
      setError(null);
      const r = await fetch(`${apiBase}/runs/${runId}/summary?refresh=1`, { headers });
      if (!r.ok && ![202, 404, 425].includes(r.status)) {
        const txt = await safeText(r);
        throw new Error(`HTTP ${r.status} ${txt || ""}`.trim());
      }
      // if it’s pending, our effect loop will retry
      setAttempt(a => a + 1);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setRefreshing(false);
    }
  }, [apiBase, runId, headers]);

  // Placeholder while pending / no data
  if (!runId || loading || !data) {
    return (
      <div className="p-4 rounded-xl border border-white/10 bg-white/5 text-sm opacity-60">
        Powered by XAi.
      </div>
    );
  }

  return (
    <section className="p-4 rounded-xl border border-white/10 bg-white/5">
      <div className="flex items-center justify-between">
        <div className="text-sm opacity-70">LLM Summary</div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-xs opacity-70 hover:opacity-100 transition disabled:opacity-40"
          title="Recompute summary"
        >
          {refreshing ? "Refreshing…" : "Rephrase"}
        </button>
      </div>

      {/* Plain-English narrative */}
      <div className="mt-1 text-sm">{data.summary}</div>

      {/* Optional risk line */}
      {data.risk && (
        <div className="mt-3 text-xs opacity-80">
          <span className="font-semibold">What could change this:</span> {data.risk}
        </div>
      )}

      {/* Short watch list */}
      {Array.isArray(data.watch) && data.watch.length > 0 && (
        <ul className="mt-2 text-xs list-disc pl-5 opacity-80">
          {data.watch.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      )}

      {/* Collapsible numeric details */}
      {data.metrics && (
        <details className="mt-3">
          <summary className="text-xs opacity-70 cursor-pointer">Details</summary>
          <div className="mt-2 grid grid-cols-2 gap-3 text-xs opacity-80">
            <div>P(up): {Math.round((data?.metrics?.prob_up_end ?? 0) * 100)}%</div>
            <div>Median: {Math.round(data?.metrics?.median_return_pct ?? 0)}%</div>
            <div>P80: {fmt(data?.metrics?.p80_low)} → {fmt(data?.metrics?.p80_high)}</div>
            <div>P95: {fmt(data?.metrics?.p95_low)} → {fmt(data?.metrics?.p95_high)}</div>
          </div>
        </details>
      )}

      <div className="mt-2 text-[10px] opacity-60"></div>

      {/* Error (soft) */}
      {error && (
        <div className="mt-2 text-[11px] text-rose-400/80">
          {error}
        </div>
      )}
    </section>
  );
}

// --- helpers ---
async function safeText(r: Response) {
  try { return await r.text(); } catch { return ""; }
}
function fmt(n?: number) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  // No currency symbol; leave formatting simple (caller knows the asset)
  return n.toFixed(4);
}
