// src/components/marketing/HeroNarrativeFlowCascade.tsx
import * as React from "react";
import { motion } from "framer-motion";

/* ---------- sizing hook (no generics at callsite) ---------- */
function useDivSize() {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) setSize({ width: cr.width, height: cr.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, size] as const;
}

/* ---------- series + helpers ---------- */
type Row = { x: number; m: number; w80: number; w95: number };

function makeSeries(n = 180, phase = 0): Row[] {
  let vMed = 0;
  const out: Row[] = [];
  for (let i = 0; i < n; i++) {
    const k = i + phase;
    vMed += (Math.sin(k / 12) * 0.7 + Math.cos(k / 20) * 0.5) * 0.65;
    const drift = Math.sin(k / 60) * 2.0;

    const w80 = 4.2 + Math.sin(k / 13) * 1.0 + Math.cos(k / 27) * 0.7;
    const w95 = 7.6 + Math.cos(k / 17) * 1.4 + Math.sin(k / 33) * 1.0;

    out.push({ x: i, m: vMed + drift, w80, w95 });
  }
  // light smoothing
  for (let i = 1; i < out.length - 1; i++) {
    out[i].m = (out[i - 1].m + 2 * out[i].m + out[i + 1].m) / 4;
  }
  return out;
}

function pathLine(xs: number[], ys: number[]) {
  if (!xs.length) return "";
  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 1; i < xs.length; i++) d += ` L ${xs[i]} ${ys[i]}`;
  return d;
}

function pathBand(xs: number[], yUpper: number[], yLower: number[]) {
  if (!xs.length) return "";
  let d = `M ${xs[0]} ${yUpper[0]}`;
  for (let i = 1; i < xs.length; i++) d += ` L ${xs[i]} ${yUpper[i]}`;
  for (let i = xs.length - 1; i >= 0; i--) d += ` L ${xs[i]} ${yLower[i]}`;
  return d + " Z";
}

/* ---------- component ---------- */
export default function HeroNarrativeFlowCascade({ height = 380 }: { height?: number }) {
  const [wrapRef, size] = useDivSize();
  const w = Math.max(320, size.width || 0);
  const h = Math.max(220, size.height || height);

  const frames = React.useMemo(() => [0, 120, 240].map((p) => makeSeries(200, p)), []);
  const margin = { top: 22, right: 18, bottom: 24, left: 18 };

  // y-domain across frames (95% envelope)
  let yMin = Infinity, yMax = -Infinity;
  for (const fr of frames) {
    for (const d of fr) {
      const u = d.m + d.w95, l = d.m - d.w95;
      if (u > yMax) yMax = u;
      if (l < yMin) yMin = l;
    }
  }
  const pad = (yMax - yMin) * 0.16; yMin -= pad; yMax += pad;

  const x0 = frames[0][0].x;
  const x1 = frames[0][frames[0].length - 1].x;
  const xToPx = (x: number) => margin.left + ((x - x0) / (x1 - x0)) * (w - margin.left - margin.right);
  const yToPx = (y: number) => h - margin.bottom - ((y - yMin) / (yMax - yMin)) * (h - margin.top - margin.bottom);

  // keyframes
  const P80 = frames.map((fr) => {
    const xs = fr.map((d) => xToPx(d.x));
    const up = fr.map((d) => yToPx(d.m + d.w80));
    const lo = fr.map((d) => yToPx(d.m - d.w80));
    return pathBand(xs, up, lo);
  });
  const P95 = frames.map((fr) => {
    const xs = fr.map((d) => xToPx(d.x));
    const up = fr.map((d) => yToPx(d.m + d.w95));
    const lo = fr.map((d) => yToPx(d.m - d.w95));
    return pathBand(xs, up, lo);
  });
  const MED = frames.map((fr) => {
    const xs = fr.map((d) => xToPx(d.x));
    const ys = fr.map((d) => yToPx(d.m));
    return pathLine(xs, ys);
  });

  return (
    <div
      ref={wrapRef}
      className="relative w-full rounded-3xl overflow-hidden border"
      style={{
        height,
        borderColor: "rgba(23,32,51,0.6)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)",
        background: "transparent", // preserves your page’s charcoal/black
      }}
      role="img"
      aria-label="Simulation fan chart"
    >
      <svg width={w} height={h} role="presentation" style={{ display: "block" }}>
        <defs>
          {/* amber bands & median */}
          <linearGradient id="band95" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(227,192,90,0.20)" />
            <stop offset="100%" stopColor="rgba(203,161,53,0.08)" />
          </linearGradient>
          <linearGradient id="band80" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(227,192,90,0.28)" />
            <stop offset="100%" stopColor="rgba(203,161,53,0.12)" />
          </linearGradient>
          <linearGradient id="medianStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E3C05A" />
          </linearGradient>

          <filter id="glowSoft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.2" result="b1" />
            <feMerge>
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <style>{`
            @keyframes shimmer {
              0% { stroke-dashoffset: 0; opacity: .32; }
              50%{ stroke-dashoffset: -900; opacity: .55; }
              100%{ stroke-dashoffset: -1800; opacity: .32; }
            }
          `}</style>
        </defs>

        {/* animated bands */}
        <motion.path
          d={P95[0]}
          animate={{ d: [...P95, P95[0]] }}
          transition={{ duration: 12, ease: "easeInOut", repeat: Infinity }}
          fill="url(#band95)"
        />
        <motion.path
          d={P80[0]}
          animate={{ d: [...P80, P80[0]] }}
          transition={{ duration: 12, ease: "easeInOut", repeat: Infinity, delay: 0.15 }}
          fill="url(#band80)"
        />

        {/* median with glow + shimmer */}
        <g filter="url(#glowSoft)">
          <motion.path
            d={MED[0]}
            animate={{ d: [...MED, MED[0]] }}
            transition={{ duration: 12, ease: "easeInOut", repeat: Infinity, delay: 0.1 }}
            stroke="url(#medianStroke)"
            strokeWidth={2.4}
            fill="none"
            strokeLinecap="round"
          />
          <motion.path
            d={MED[0]}
            animate={{ d: [...MED, MED[0]] }}
            transition={{ duration: 12, ease: "easeInOut", repeat: Infinity, delay: 0.1 }}
            stroke="#ffffff"
            strokeWidth={2.0}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="120 900"
            style={{ mixBlendMode: "screen", animation: "shimmer 3.6s linear infinite" }}
            opacity={0.30}
          />
        </g>
      </svg>
    </div>
  );
}
