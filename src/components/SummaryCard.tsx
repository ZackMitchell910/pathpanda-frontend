import * as React from "react";

type EOD = { day_index: number; median: number; mean: number; p05: number; p95: number };

type Props = {
  /** 0..1, from latest /simulate artifact (prob_up_end) */
  probUpEnd?: number | null;
  /** 0..1, optional from /predict (prob_up_next) */
  probUpNext?: number | null;
  progress?: number;           // 0..100
  currentPrice?: number;
  eod?: EOD | null;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const pct = (v?: number | null, d = 1) =>
  Number.isFinite(v as number) ? `${(clamp01(v as number) * 100).toFixed(d)}%` : "—";

function ProbRow({ label, value }: { label: string; value?: number | null }) {
  if (!Number.isFinite(value as number)) {
    return (
      <div className="flex items-center justify-between py-1">
        <span className="opacity-70">{label}</span>
        <span className="opacity-60">—</span>
      </div>
    );
  }
  const v = clamp01(value as number);
  const w = `${(v * 100).toFixed(0)}%`;
  return (
    <div className="py-1">
      <div className="flex items-center justify-between text-xs opacity-70">
        <span>{label}</span>
        <span className="tabular-nums">{pct(v)}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-white/30" style={{ width: w }} />
      </div>
    </div>
  );
}

function sentimentClass(v?: number | null) {
  if (!Number.isFinite(v as number)) return "text-zinc-300";
  const x = v as number;
  if (x > 0.51) return "text-[#34D399]"; // green-ish
  if (x < 0.49) return "text-[#F87171]"; // red-ish
  return "text-[#FBBF24]";               // amber-ish
}
function sentimentLabel(v?: number | null) {
  if (!Number.isFinite(v as number)) return "—";
  const x = v as number;
  if (x > 0.51) return "Bullish";
  if (x < 0.49) return "Bearish";
  return "Neutral";
}

export function SummaryCard({
  probUpEnd,
  probUpNext,
  progress = 0,
  currentPrice,
  eod,
}: Props) {
  return (
    <div className="text-sm">
      {/* Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs opacity-70">
          <span>Run progress</span>
          <span className="tabular-nums">{Math.round(Math.max(0, Math.min(100, progress)))}%</span>
        </div>
        <div className="mt-1 h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-white/40" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      </div>

      {/* Probabilities */}
      {Number.isFinite(probUpNext as number) && (
        <ProbRow label="Prob up next" value={probUpNext as number} />
      )}
      <div className="mt-1">
        <ProbRow label="Prob up by horizon" value={probUpEnd as number} />
      </div>

      {/* Sentiment badge (based on horizon) */}
      <div className={`mt-2 text-xs ${sentimentClass(probUpEnd)}`}>
        {sentimentLabel(probUpEnd)}
      </div>

      {/* KPIs */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <div className="opacity-60">Current</div>
          <div className="font-mono">
            {Number.isFinite(currentPrice as number) ? `$${(currentPrice as number).toFixed(2)}` : "—"}
          </div>
        </div>

        <div>
          <div className="opacity-60">EOD estimate (median)</div>
          <div className="font-mono">
            {eod ? `$${eod.median.toFixed(2)} (D${eod.day_index})` : "—"}
          </div>
        </div>

        <div>
          <div className="opacity-60">EOD range (p05–p95)</div>
          <div className="font-mono">
            {eod ? `$${eod.p05.toFixed(2)} – $${eod.p95.toFixed(2)}` : "—"}
          </div>
        </div>

        {eod && (
          <div>
            <div className="opacity-60">Mean</div>
            <div className="font-mono">${eod.mean.toFixed(2)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
