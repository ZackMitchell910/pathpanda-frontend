"use client";
import React, { useEffect, useMemo, useState } from "react";

type Leaderboard = {
  n: number;
  win_rate: number;
  mdape: number;
  coverage_90: number;
};

type CohortListItem = {
  cohort_id: number;
  cohort_date: string;       // ISO
  horizon_days: number;
  model_version: string;
  artifact_hash: string;
  created_at: string;
};

type CohortPick = {
  symbol: string;
  start_price: number;
  tgt_date: string;
  forecast_med: number;
  band_p05?: number | null;
  band_p95?: number | null;
  realized_price?: number | null;
  abs_pct_err?: number | null;
  within_90pc?: boolean | null;
};

type CohortDetail = {
  cohort_id: number;
  cohort_date: string;
  horizon_days: number;
  model_version: string;
  artifact_hash: string;
  picks: CohortPick[];
};

const API =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  ""; // if blank and you added proxy('/track'), fetch will still go to same origin

function pct(x: number | null | undefined, digits = 1) {
  if (x == null || !isFinite(x)) return "—";
  return `${(x * 100).toFixed(digits)}%`;
}

export function TrackRecordPanel({ windowDays = 30 }: { windowDays?: number }) {
  const [leader, setLeader] = useState<Leaderboard | null>(null);
  const [cohorts, setCohorts] = useState<CohortListItem[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<CohortDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // base URL helper (supports either absolute API or same-origin + proxy)
  const base = useMemo(() => API.replace(/\/$/, ""), []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // Leaderboard
        {
          const url = base ? `${base}/track/leaderboard?window=${windowDays}` : `/track/leaderboard?window=${windowDays}`;
          const r = await fetch(url);
          if (!r.ok) throw new Error(`leaderboard HTTP ${r.status}`);
          setLeader(await r.json());
        }

        // Recent cohorts
        {
          const url = base ? `${base}/track/cohorts?limit=10` : `/track/cohorts?limit=10`;
          const r = await fetch(url);
          if (!r.ok) throw new Error(`cohorts HTTP ${r.status}`);
          const list: CohortListItem[] = await r.json();
          setCohorts(list);
          if (list.length) setSelected(list[0].cohort_id);
        }
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load track record.");
      } finally {
        setLoading(false);
      }
    })();
  }, [base, windowDays]);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      try {
        setDetail(null);
        const url = base ? `${base}/track/cohort/${selected}` : `/track/cohort/${selected}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`cohort ${selected} HTTP ${r.status}`);
        setDetail(await r.json());
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load cohort.");
      }
    })();
  }, [base, selected]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Track Record</div>
        <div className="text-xs text-white/60">Window: {windowDays}d</div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Samples" value={leader?.n?.toLocaleString() ?? "—"} />
        <Metric label="Win Rate" value={pct(leader?.win_rate)} />
        <Metric label="MdAPE" value={pct(leader?.mdape)} />
        <Metric label="90% Coverage" value={pct(leader?.coverage_90)} />
      </div>

      {/* Cohorts list */}
      <div className="mt-4">
        <div className="text-xs uppercase tracking-wide opacity-70 mb-2">Recent Cohorts</div>
        <div className="flex flex-wrap gap-2">
          {cohorts.map((c) => (
            <button
              key={c.cohort_id}
              onClick={() => setSelected(c.cohort_id)}
              className={`text-xs rounded-md px-2.5 py-1.5 border ${
                selected === c.cohort_id
                  ? "border-emerald-400 bg-emerald-400/10 text-emerald-200"
                  : "border-white/10 hover:border-white/30 text-white/80"
              }`}
              title={`H${c.horizon_days} • ${c.cohort_date}`}
            >
              #{c.cohort_id} • H{c.horizon_days}
            </button>
          ))}
        </div>
      </div>

      {/* Cohort detail */}
      <div className="mt-4">
        <div className="text-xs uppercase tracking-wide opacity-70 mb-2">Cohort Detail</div>
        {loading && <div className="text-xs opacity-70">Loading…</div>}
        {err && <div className="text-xs text-red-300">Error: {err}</div>}
        {!loading && !err && detail && (
          <div className="overflow-auto rounded-md border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.04] text-white/80">
                <tr>
                  <Th>Symbol</Th>
                  <Th>Start</Th>
                  <Th>Forecast (P50)</Th>
                  <Th>Band 5–95</Th>
                  <Th>Realized</Th>
                  <Th>Abs % Err</Th>
                  <Th>Within 90%</Th>
                </tr>
              </thead>
              <tbody>
                {detail.picks.map((p) => (
                  <tr key={p.symbol} className="border-t border-white/10">
                    <Td>{p.symbol}</Td>
                    <Td>${p.start_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Td>
                    <Td>${p.forecast_med.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Td>
                    <Td>
                      {p.band_p05 != null && p.band_p95 != null
                        ? `$${p.band_p05.toFixed(2)} – $${p.band_p95.toFixed(2)}`
                        : "—"}
                    </Td>
                    <Td>
                      {p.realized_price != null
                        ? `$${p.realized_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                        : "—"}
                    </Td>
                    <Td>{p.abs_pct_err != null ? pct(p.abs_pct_err) : "—"}</Td>
                    <Td>{p.within_90pc == null ? "—" : p.within_90pc ? "Yes" : "No"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !err && !detail && <div className="text-xs opacity-70">Select a cohort above.</div>}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide opacity-70">{label}</div>
      <div>{value}</div>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-medium">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2">{children}</td>;
}
