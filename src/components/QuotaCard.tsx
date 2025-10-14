// ==========================
// File: src/components/QuotaCard.tsx
// ==========================
import React, { useEffect, useState } from "react";

type Limits = {
  ok: boolean;
  plan: "free" | "pro" | "inst" | string;
  caller: string;
  reset_secs: number;
  per_min_caps: { base: number; simulate: number; cron: number };
  daily: {
    simulate: { used: number; limit: number; remaining: number };
    cron: { used: number; limit: number; remaining: number };
  };
};

function fmtHMS(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${m}m ${s}s`;
}

async function fetchLimits(apiBase: string, apiKey: string): Promise<Limits> {
  const r = await fetch(`${apiBase}/me/limits`, {
    headers: { "X-API-Key": apiKey, Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`limits ${r.status}`);
  return r.json();
}

export default function QuotaCard() {
  // Resolve API base & key (aligns with your existing helper)
  const API_BASE = String(
    (typeof window !== "undefined" && (window as any).__PP_API_BASE__) ||
      (import.meta as any)?.env?.VITE_PT_API_BASE ||
      ""
  ).replace(/\/+$/, "");

  const resolvedPtKey = (): string => {
    // Prefer window storage your app already uses; fallback to localStorage
    const w = typeof window !== "undefined" ? (window as any) : {};
    if (w.__PP_KEY__) return String(w.__PP_KEY__);
    const ls =
      typeof window !== "undefined"
        ? window.localStorage.getItem("pp_api_key")
        : "";
    return String(ls || "");
  };

  const [data, setData] = useState<Limits | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const key = resolvedPtKey();
    if (!API_BASE || !key) {
      setErr("Missing API base or API key");
      return;
    }
    fetchLimits(API_BASE, key)
      .then(setData)
      .catch((e) => setErr(String(e)));
  }, [API_BASE]);

  // simple 1s countdown tick for reset timer
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (err) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-rose-400">Quota status unavailable</div>
        <div className="text-xs text-white/60 mt-1">{err}</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 animate-pulse">
        <div className="h-4 w-24 bg-white/10 rounded mb-2" />
        <div className="h-3 w-40 bg-white/10 rounded mb-3" />
        <div className="h-2 w-full bg-white/10 rounded" />
      </div>
    );
  }

  const sim = data.daily.simulate;
  const pct =
    data.daily.simulate.limit > 0
      ? Math.min(100, Math.round((sim.used / data.daily.simulate.limit) * 100))
      : 0;
  const resetLeft = Math.max(0, data.reset_secs - tick);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <div className="font-semibold">
            Plan: <span className="uppercase">{data.plan}</span>
          </div>
          <div className="text-white/70 text-xs">
            Per-minute cap: {data.per_min_caps.simulate} (simulate)
          </div>
        </div>
        <div className="text-xs text-white/60">
          Resets in {fmtHMS(resetLeft)}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span>Daily simulate</span>
          <span>
            {sim.used} / {sim.limit}
          </span>
        </div>
        <div className="w-full h-2 rounded bg-white/10 overflow-hidden">
          <div
            className="h-2 rounded bg-white/40"
            style={{ width: `${pct}%` }}
            title={`${pct}% used`}
          />
        </div>
        <div className="text-xs text-white/60 mt-1">
          {sim.remaining} remaining today
        </div>
      </div>
    </div>
  );
}

