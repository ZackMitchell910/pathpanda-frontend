// ==========================
// File: src/components/QuotaCard.tsx
// ==========================
import React, { useEffect, useMemo, useState } from "react";
import { resolveApiBase, resolveApiKey } from "@/utils/apiConfig";

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
  const s = Math.max(0, total % 60);
  return `${h}h ${m}m ${s}s`;
}

async function fetchLimits(apiBase: string, apiKey: string): Promise<Limits> {
  const r = await fetch(`${apiBase}/me/limits`, {
    headers: { "X-API-Key": apiKey, Accept: "application/json" },
    cache: "no-store",
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`limits ${r.status} ${txt || ""}`.trim());
  }
  return r.json();
}

type QuotaCardProps = {
  apiBase?: string;
  apiKey?: string;
};

export default function QuotaCard({ apiBase: apiBaseProp, apiKey: apiKeyProp }: QuotaCardProps = {}) {
  const apiBase = (apiBaseProp ?? resolveApiBase()).trim();
  const key = (apiKeyProp ?? resolveApiKey()).trim();

  const [data, setData] = useState<Limits | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const sim = data?.daily.simulate ?? null;

  const perMinCaps = data?.per_min_caps;
  const pct = useMemo(() => {
    if (!sim) return 0;
    const lim = Math.max(0, sim.limit || 0);
    const used = Math.max(0, sim.used || 0);
    return lim > 0 ? Math.min(100, Math.round((used / lim) * 100)) : 0;
  }, [sim?.limit, sim?.used]);
  const resetLeft = data ? Math.max(0, (data.reset_secs || 0) - tick) : 0;

  // load once
  useEffect(() => {
    if (!apiBase || !key) {
      setErr("Missing API base or API key");
      setData(null);
      return;
    }
    fetchLimits(apiBase, key)
      .then((d) => {
        setData(d);
        setErr(null);
      })
      .catch((e) => setErr(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, key]);

  // 1s countdown
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

  if (!sim || !perMinCaps) {
    return null;
  }


  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <div className="font-semibold">
            Plan: <span className="uppercase">{data.plan}</span>
          </div>
          <div className="text-white/70 text-xs">
            Per-minute caps – base: {perMinCaps.base}, simulate: {perMinCaps.simulate}, cron: {perMinCaps.cron}
          </div>
        </div>
        <div className="text-xs text-white/60">Resets in {fmtHMS(resetLeft)}</div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span>Daily simulate</span>
          <span>
            {sim.used} / {sim.limit}
          </span>
        </div>
        <div
          className="w-full h-2 rounded bg-white/10 overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Daily simulate usage"
        >
          <div
            className="h-2 rounded bg-white/40"
            style={{ width: `${pct}%` }}
            title={`${pct}% used`}
          />
        </div>
        <div className="text-xs text-white/60 mt-1">{sim.remaining} remaining today</div>
      </div>
    </div>
  );
}
