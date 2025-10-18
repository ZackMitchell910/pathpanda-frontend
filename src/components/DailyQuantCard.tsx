import React, { useEffect, useMemo, useState } from "react";
import { useSimetrixClient } from "@/dashboard/DashboardProvider";

type MaybeNumber = number | string | null | undefined;

type DailyQuantContext = {
  sentiment?: {
    avg_sent_7d?: MaybeNumber;
    avg_sent_last24h?: MaybeNumber;
    last24h?: MaybeNumber;
    avg7d?: MaybeNumber;
    avg_7d?: MaybeNumber;
    last_24h?: MaybeNumber;
  } | null;
  macro?: {
    rff?: MaybeNumber;
    cpi_yoy?: MaybeNumber;
    u_rate?: MaybeNumber;
    updated_at?: string | null;
  } | null;
  regime?: { name?: string | null; score?: MaybeNumber } | null;
  scheduler?: Record<string, unknown> | null;
};

type DailyQuantEntry = {
  symbol?: string;
  prob_up_end?: MaybeNumber;
  prob_up_end_raw?: MaybeNumber;
  median_return_pct?: MaybeNumber;
  horizon_days?: MaybeNumber;
  blurb?: string | null;
  context?: DailyQuantContext | null;
  updated_at?: string | null;
};

type DailyQuantResponse = {
  equity?: DailyQuantEntry | null;
  crypto?: DailyQuantEntry | null;
  updated_at?: string | null;
};

const toNumber = (value: MaybeNumber): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const formatPercentWithSign = (value: MaybeNumber, digits = 1): string => {
  const num = toNumber(value);
  if (num === null) return "-";
  const scaled = Math.abs(num) <= 1 ? num * 100 : num;
  return `${scaled >= 0 ? "+" : ""}${scaled.toFixed(digits)}%`;
};

const normalizeProbability = (value: MaybeNumber): number | null => {
  const num = toNumber(value);
  if (num === null) return null;
  return Math.abs(num) <= 1 ? num * 100 : num;
};

const formatTimestamp = (value?: string | null): string | null => {
  if (!value || typeof value !== "string") return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleString();
};

const extractSchedulerTimestamps = (context?: DailyQuantContext | null) => {
  const scheduler = context?.scheduler ?? null;
  const entries: Array<{ label: string; iso: string }> = [];
  if (scheduler && typeof scheduler === "object") {
    const sched: any = scheduler;
    const push = (label: string, val: MaybeNumber) => {
      if (typeof val === "string" && val.trim()) {
        entries.push({ label, iso: val.trim() });
      }
    };
    push("news", sched.news_fetch_ts ?? sched.news_ts ?? sched.news?.ts);
    push("earnings", sched.earnings_fetch_ts ?? sched.earnings_ts ?? sched.earnings?.ts);
    push("macro", sched.macro_fetch_ts ?? sched.macro_ts ?? sched.macro?.ts);
  }
  return entries;
};

export default function DailyQuantCard({
  onOpen,
}: {
  onOpen: (symbol: string, horizon: number) => void;
}) {
  const client = useSimetrixClient();
  const [data, setData] = useState<DailyQuantResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(undefined);
        const resp = await client.request("/quant/daily/today");
        const text = await resp.text();
        const json = text ? ((JSON.parse(text) as DailyQuantResponse)) : ({} as DailyQuantResponse);
        if (!resp.ok) {
          const detail = (json as any)?.detail ?? resp.statusText;
          throw new Error(typeof detail === "string" ? detail : "Request failed");
        }
        if (!cancelled) {
          setData(json);
        }
      } catch (error: any) {
        if (!cancelled) {
          setErr(error?.message || String(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client]);

  const { equity, crypto } = useMemo(() => {
    if (!data) return { equity: null, crypto: null };
    return {
      equity: data.equity ?? null,
      crypto: data.crypto ?? null,
    };
  }, [data]);

  if (loading) return <div className="text-xs text-white/70">Loading daily quant picks...</div>;
  if (err) return <div className="text-xs text-rose-400">{err}</div>;
  if (!equity && !crypto) return null;

  const Item = ({ item, label }: { item: DailyQuantEntry | null; label: string }) => {
    const symbol = item?.symbol?.trim();
    if (!symbol) return null;

    const horizon = toNumber(item?.horizon_days) ?? 30;
    const probAdjPct = normalizeProbability(item?.prob_up_end);
    const probRawPct = normalizeProbability(item?.prob_up_end_raw);
    const deltaPct =
      probAdjPct !== null && probRawPct !== null ? Number((probAdjPct - probRawPct).toFixed(1)) : null;
    const medianReturn = formatPercentWithSign(item?.median_return_pct, 1);
    const context = item?.context ?? null;
    const sentiment = context?.sentiment ?? null;
    const macro = context?.macro ?? null;
    const regime = context?.regime ?? null;
    const scheduler = extractSchedulerTimestamps(context);
    const refreshedAt =
      formatTimestamp(item?.updated_at ?? macro?.updated_at ?? data?.updated_at) ?? undefined;

    const sentimentAvg = sentiment
      ? formatPercentWithSign(
          sentiment.avg_sent_7d ?? sentiment.avg7d ?? sentiment.avg_7d,
          1
        )
      : null;
    const sentiment24h = sentiment
      ? formatPercentWithSign(
          sentiment.avg_sent_last24h ?? sentiment.last24h ?? sentiment.last_24h,
          1
        )
      : null;

    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between text-[11px] text-white/60">
          <span>{label}</span>
          {refreshedAt && <span className="text-white/40">Refreshed {refreshedAt}</span>}
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <div>
            <div className="text-lg font-semibold text-white">{symbol}</div>
            <div className="text-xs text-white/70">
              {horizon}d | median {medianReturn}
            </div>
          </div>
          <button
            onClick={() => onOpen(symbol, horizon)}
            className="text-[11px] text-emerald-300 underline"
          >
            Open
          </button>
        </div>

        <div className="mt-2 space-y-1 text-xs text-white/70">
          <div className="flex items-center justify-between">
            <span>Adj P(up)</span>
            <span className="font-mono text-white">
              {probAdjPct !== null ? `${probAdjPct.toFixed(1)}%` : "-"}
            </span>
          </div>
          {probRawPct !== null && (
            <div className="flex items-center justify-between text-white/60">
              <span>Raw P(up)</span>
              <span className="font-mono">
                {probRawPct.toFixed(1)}%
                {deltaPct !== null && (
                  <span className={`ml-2 ${deltaPct >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {deltaPct >= 0 ? "+" : ""}
                    {deltaPct.toFixed(1)} pts
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/70">
          {regime && (regime.name || toNumber(regime.score) !== null) && (
            <span className="rounded-full border border-white/15 px-2 py-0.5">
              Regime {regime.name ?? ""}{" "}
              {toNumber(regime.score) !== null ? formatPercentWithSign(regime.score, 0) : ""}
            </span>
          )}
          {sentimentAvg && (
            <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-emerald-200">
              Sent 7d {sentimentAvg}
            </span>
          )}
          {sentiment24h && (
            <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-sky-200">
              24h {sentiment24h}
            </span>
          )}
          {macro && toNumber(macro.rff) !== null && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/70">
              RFF {formatPercentWithSign(macro.rff, 2)}
            </span>
          )}
          {macro && toNumber(macro.cpi_yoy) !== null && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/70">
              CPI {formatPercentWithSign(macro.cpi_yoy, 1)}
            </span>
          )}
          {macro && toNumber(macro.u_rate) !== null && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/70">
              U {formatPercentWithSign(macro.u_rate, 1)}
            </span>
          )}
        </div>

        {scheduler.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-white/50">
            {scheduler.map((entry) => (
              <span key={`${entry.label}-${entry.iso}`} className="rounded border border-white/10 px-2 py-0.5">
                {entry.label}: {formatTimestamp(entry.iso) ?? entry.iso}
              </span>
            ))}
          </div>
        )}

        {item?.blurb && (
          <p className="mt-3 text-sm text-white/80">{item.blurb}</p>
        )}
      </div>
    );
  };

  return (
    <section className="grid gap-3 md:grid-cols-2">
      <Item item={equity} label="Equity" />
      <Item item={crypto} label="Crypto" />
    </section>
  );
}
