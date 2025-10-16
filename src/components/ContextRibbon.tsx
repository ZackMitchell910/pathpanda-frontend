import React, { useEffect, useMemo, useState } from "react";
import { resolveApiBase, resolveApiKey } from "@/utils/apiConfig";

type MaybeNumber = number | string | null | undefined;

type ContextPayload = {
  regime?: { name?: string | null; score?: MaybeNumber } | null;
  sentiment?: {
    avg_7d?: MaybeNumber;
    last24h?: MaybeNumber;
    avg7d?: MaybeNumber;
    day?: MaybeNumber;
  } | null;
  earnings?: {
    surprise_pct?: MaybeNumber;
    surprise_percent?: MaybeNumber;
    surprise?: MaybeNumber;
    last_surprise_pct?: MaybeNumber;
    days_since?: MaybeNumber;
    days?: MaybeNumber;
    last_event_days_ago?: MaybeNumber;
  } | null;
  macro?: {
    rff?: MaybeNumber;
    cpi_yoy?: MaybeNumber;
    u_rate?: MaybeNumber;
  } | null;
  [key: string]: unknown;
};

type Props = {
  symbol?: string | null;
  className?: string;
};

const fmtPercent = (value: MaybeNumber, digits = 1) => {
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num as number)) return "–";
  const n = Number(num);
  const scaled = Math.abs(n) <= 1 ? n * 100 : n;
  return `${scaled >= 0 ? "+" : ""}${scaled.toFixed(digits)}%`;
};

const fmtRate = (value: MaybeNumber, digits = 2) => {
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num as number)) return "–";
  return `${Number(num).toFixed(digits)}%`;
};

const fmtDaysAgo = (value: MaybeNumber) => {
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num as number)) return "–";
  const n = Math.max(0, Math.round(Number(num)));
  if (n === 0) return "today";
  if (n === 1) return "1d ago";
  return `${n}d ago`;
};

const useContextData = (symbol?: string | null) => {
  const [state, setState] = useState<{
    status: "idle" | "loading" | "ready" | "error";
    data: ContextPayload | null;
    error?: string;
  }>({ status: "idle", data: null });

  useEffect(() => {
    const sym = symbol?.trim()?.toUpperCase();
    const apiBase = resolveApiBase();
    if (!sym || !apiBase) {
      setState((prev) => (prev.status === "idle" && !prev.data ? prev : { status: "idle", data: null }));
      return;
    }

    const controller = new AbortController();
    const fetchContext = async () => {
      setState((prev) => ({ status: "loading", data: prev.data ?? null }));
      try {
        const headers: Record<string, string> = { Accept: "application/json" };
        const key = resolveApiKey();
        if (key) headers["X-API-Key"] = key;
        const resp = await fetch(`${apiBase}/context/${encodeURIComponent(sym)}`, {
          headers,
          signal: controller.signal,
          cache: "no-store",
        });
        if (!resp.ok) {
          const txt = await resp.text().catch(() => "");
          throw new Error(txt || `HTTP ${resp.status}`);
        }
        const payload: ContextPayload = await resp.json();
        setState({ status: "ready", data: payload });
      } catch (err: any) {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          data: null,
          error: err?.message || "Context unavailable",
        });
      }
    };

    fetchContext();
    return () => controller.abort();
  }, [symbol]);

  return state;
};

export function ContextRibbon({ symbol, className }: Props) {
  const { status, data, error } = useContextData(symbol);

  const content = useMemo(() => {
    if (!data) return null;
    const regimeName =
      data.regime?.name ??
      (typeof (data.regime as any)?.label === "string" ? (data.regime as any).label : null);
    const regimeScore =
      data.regime?.score ??
      (data.regime && typeof (data.regime as any)?.score_pct === "number"
        ? (data.regime as any).score_pct
        : undefined);

    const sentiment = data.sentiment ?? {};
    const avg7d = sentiment.avg_7d ?? sentiment.avg7d ?? sentiment.day;
    const last24h = sentiment.last24h;

    const earnings = data.earnings ?? {};
    const surprise =
      earnings.last_surprise_pct ??
      earnings.surprise_pct ??
      earnings.surprise_percent ??
      earnings.surprise;
    const days = earnings.days_since ?? earnings.last_event_days_ago ?? earnings.days;

    const macro = data.macro ?? {};

    return {
      regimeName: typeof regimeName === "string" ? regimeName : null,
      regimeScore,
      avg7d,
      last24h,
      surprise,
      days,
      macro,
    };
  }, [data]);

  if (!symbol?.trim()) {
    return null;
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70 ${
        className ?? ""
      }`}
    >
      <span className="font-semibold text-white/80">{symbol?.toUpperCase()}</span>
      {status === "loading" && <span className="animate-pulse text-white/50">Loading context...</span>}
      {status === "error" && <span className="text-rose-400">{error ?? "Context unavailable"}</span>}
      {status === "ready" && content && (
        <>
          <span className="flex items-center gap-1">
            <span className="uppercase tracking-wide text-white/50">Regime</span>
            {content.regimeName ? (
              <span className="font-medium text-white">{content.regimeName}</span>
            ) : (
              <span>–</span>
            )}
            {Number.isFinite(Number(content.regimeScore)) && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/80">
                {fmtPercent(content.regimeScore as MaybeNumber, 0)}
              </span>
            )}
          </span>
          <span className="flex items-center gap-2">
            <span className="uppercase tracking-wide text-white/50">Sentiment</span>
            <span>{fmtPercent(content.avg7d)}</span>
            <span className="text-white/40">/</span>
            <span>{fmtPercent(content.last24h)}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="uppercase tracking-wide text-white/50">Earnings</span>
            <span>{fmtPercent(content.surprise)}</span>
            <span className="text-white/40">|</span>
            <span>{fmtDaysAgo(content.days)}</span>
          </span>
          <span className="flex items-center gap-2 text-white/50">
            <span className="uppercase tracking-wide">Macro</span>
            <span className="text-white/70">RFF {fmtRate(content.macro?.rff, 2)}</span>
            <span>| CPI {fmtRate(content.macro?.cpi_yoy, 1)}</span>
            <span>| U {fmtRate(content.macro?.u_rate, 1)}</span>
          </span>
        </>
      )}
    </div>
  );
}

export default ContextRibbon;
