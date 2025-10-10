"use client";

import * as React from "react";
import { ParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { line as d3line, curveCatmullRom, area as d3area } from "d3-shape";
import { motion } from "framer-motion";

// ---------- types ----------
type Row = { x: number; m: number; w80: number; w95: number };
type XY = { x: number; y: number };

// ---------- data generator (deterministic but phaseable) ----------
function makeSeries(n = 180, phase = 0): Row[] {
  let v = 0;
  const out: Row[] = [];
  for (let i = 0; i < n; i++) {
    const k = i + phase;
    v += (Math.sin(k / 10) * 0.7 + Math.cos(k / 18) * 0.5 + Math.sin((k + 40) / 36) * 0.35) * 0.55;
    const drift = Math.sin(k / 60) * 2.0;
    const w80 = 4.7 + Math.sin(k / 13) * 1.05 + Math.cos(k / 27) * 0.8;
    const w95 = 8.3 + Math.cos(k / 17) * 1.5 + Math.sin(k / 33) * 1.1;
    out.push({ x: i, m: v + drift, w80, w95 });
  }
  for (let i = 1; i < out.length - 1; i++) out[i].m = (out[i - 1].m + 2 * out[i].m + out[i + 1].m) / 4;
  return out;
}

const curve = curveCatmullRom.alpha(0.5);
const L = d3line<XY>().x(d => d.x).y(d => d.y).curve(curve);
const A = (lower: XY[]) =>
  d3area<XY>()
    .x(d => d.x)
    .y0(d => d.y)
    .y1((_d, i, arr) => lower[lower.length - 1 - i].y) // mirror lower reversed
    .curve(curve);

// ---------- keyframe builder ----------
function buildKeyframes(width: number, height: number) {
  const margin = { top: 22, right: 18, bottom: 24, left: 18 };
  const phases = [0, 120, 240]; // three keyframes
  const frames = phases.map(p => makeSeries(200, p));

  // y-domain from 95% envelope across all frames
  let yMin = Infinity, yMax = -Infinity;
  for (const fr of frames) {
    for (const d of fr) {
      const u = d.m + d.w95, l = d.m - d.w95;
      if (u > yMax) yMax = u;
      if (l < yMin) yMin = l;
    }
  }
  const pad = (yMax - yMin) * 0.16;
  yMin -= pad; yMax += pad;

  const xMin = frames[0][0].x;
  const xMax = frames[0][frames[0].length - 1].x;

  const x = scaleLinear<number>({ domain: [xMin, xMax], range: [margin.left, width - margin.right] });
  const y = scaleLinear<number>({ domain: [yMin, yMax], range: [height - margin.bottom, margin.top] });

  const toXY   = (d: Row): XY => ({ x: x(d.x), y: y(d.m) });
  const toU80  = (d: Row): XY => ({ x: x(d.x), y: y(d.m + d.w80) });
  const toL80  = (d: Row): XY => ({ x: x(d.x), y: y(d.m - d.w80) });
  const toU95  = (d: Row): XY => ({ x: x(d.x), y: y(d.m + d.w95) });
  const toL95  = (d: Row): XY => ({ x: x(d.x), y: y(d.m - d.w95) });

  const P95 = frames.map(f => (A(f.map(toL95)) as any)(f.map(toU95)) || "");
  const P80 = frames.map(f => (A(f.map(toL80)) as any)(f.map(toU80)) || "");
  const MED = frames.map(f => L(f.map(toXY)) || "");

  // make loop seamless by repeating the first at the end
  return {
    P95: [...P95, P95[0]],
    P80: [...P80, P80[0]],
    MED: [...MED, MED[0]],
    margin,
  };
}

export default function HeroNarrativeFlowCascade({ height = 380 }: { height?: number }) {
  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden border"
      style={{
        height,
        borderColor: "#172033",
        background: "radial-gradient(120% 90% at 50% 0%, #0A1220 0%, #07111B 55%, #060E18 100%)",
        boxShadow: "0 0 80px rgba(56,189,248,0.09), inset 0 0 0 1px rgba(255,255,255,0.02)",
      }}
    >
      <ParentSize>
        {({ width, height }) => {
          const w = Math.max(320, width);
          const h = Math.max(220, height);

          // 👇 compute keyframes in JS, not in JSX
          const { P95, P80, MED, margin } = React.useMemo(() => buildKeyframes(w, h), [w, h]);

          return (
            <svg width={w} height={h} role="presentation" style={{ display: "block" }}>
              <defs>
                <radialGradient id="innerVignette" cx="50%" cy="32%" r="70%">
                  <stop offset="0%" stopColor="rgba(34,197,94,0.08)" />
                  <stop offset="65%" stopColor="rgba(34,197,94,0.02)" />
                  <stop offset="100%" stopColor="rgba(2,6,23,0)" />
                </radialGradient>
                <linearGradient id="band95" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(111,201,255,0.18)" />
                  <stop offset="100%" stopColor="rgba(111,201,255,0.06)" />
                </linearGradient>
                <linearGradient id="band80" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(88,231,185,0.22)" />
                  <stop offset="100%" stopColor="rgba(88,231,185,0.08)" />
                </linearGradient>
                <linearGradient id="medianStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#FAFAFA" />
                  <stop offset="100%" stopColor="#9AE6B4" />
                </linearGradient>
                <filter id="glow1" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="2.2" result="b1" />
                  <feMerge><feMergeNode in="b1" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="glow2" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="6" result="b2" />
                  <feMerge><feMergeNode in="b2" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <style>{`
                  @keyframes shimmer {
                    0% { stroke-dashoffset: 0; opacity: .32; }
                    50%{ stroke-dashoffset: -900; opacity: .55; }
                    100%{ stroke-dashoffset: -1800; opacity: .32; }
                  }
                `}</style>
              </defs>

              {/* plot rect + vignette */}
              <rect
                x={margin.left}
                y={margin.top}
                width={w - margin.left - margin.right}
                height={h - margin.top - margin.bottom}
                fill="url(#innerVignette)"
              />

              {/* animated bands */}
              <motion.path
                d={P95[0]}
                animate={{ d: P95 }}
                transition={{
                  duration: 12,
                  ease: "easeInOut",
                  times: [0, 0.33, 0.66, 1],
                  repeat: Infinity,
                  repeatType: "loop",
                }}
                fill="url(#band95)"
              />
              <motion.path
                d={P80[0]}
                animate={{ d: P80 }}
                transition={{
                  duration: 12,
                  ease: "easeInOut",
                  times: [0, 0.33, 0.66, 1],
                  repeat: Infinity,
                  repeatType: "loop",
                  delay: 0.15,
                }}
                fill="url(#band80)"
              />

              {/* median with layered glow + shimmer */}
              <g filter="url(#glow1)">
                <motion.path
                  d={MED[0]}
                  animate={{ d: MED }}
                  transition={{
                    duration: 12,
                    ease: "easeInOut",
                    times: [0, 0.33, 0.66, 1],
                    repeat: Infinity,
                    repeatType: "loop",
                    delay: 0.1,
                  }}
                  stroke="url(#medianStroke)"
                  strokeWidth={2.4}
                  fill="none"
                  strokeLinecap="round"
                />
                <g filter="url(#glow2)">
                  <motion.path
                    d={MED[0]}
                    animate={{ d: MED }}
                    transition={{
                      duration: 12,
                      ease: "easeInOut",
                      times: [0, 0.33, 0.66, 1],
                      repeat: Infinity,
                      repeatType: "loop",
                      delay: 0.1,
                    }}
                    stroke="white"
                    strokeWidth={1.4}
                    fill="none"
                    strokeLinecap="round"
                    opacity={0.22}
                  />
                </g>
                <motion.path
                  d={MED[0]}
                  animate={{ d: MED }}
                  transition={{
                    duration: 12,
                    ease: "easeInOut",
                    times: [0, 0.33, 0.66, 1],
                    repeat: Infinity,
                    repeatType: "loop",
                    delay: 0.1,
                  }}
                  stroke="white"
                  strokeWidth={2.2}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="120 900"
                  style={{ mixBlendMode: "screen", animation: "shimmer 3.6s linear infinite" }}
                  opacity={0.35}
                />
              </g>
            </svg>
          );
        }}
      </ParentSize>
    </div>
  );
}
