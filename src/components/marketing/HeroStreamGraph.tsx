"use client";

import { useMemo } from "react";
import { AreaClosed } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { LinearGradient } from "@visx/gradient";
import { motion } from "framer-motion";

function prepareStreams(data: any) {
  // Transform fan chart data into stacked streams
  const { xs, median, upper80, lower80 } = data;
  const baseline = median.map(m => m - (upper80[0] - lower80[0]) / 2); // Normalize baseline
  return [
    { id: 0, values: xs.map((x: number, i: number) => ({ x, y0: baseline[i], y1: median[i] })) }, // Central median stream
    { id: 1, values: xs.map((x: number, i: number) => ({ x, y0: median[i], y1: upper80[i] })) }, // Upper p80
    { id: 2, values: xs.map((x: number, i: number) => ({ x, y0: lower80[i], y1: median[i] })) }, // Lower p80
  ];
}

function genSeries(n = 80) {
  // Reuse original genSeries logic
  const xs = Array.from({ length: n }, (_, i) => i);
  let v = 0;
  const median: number[] = [];
  for (let i = 0; i < n; i++) {
    v += (Math.sin(i / 9) * 0.7 + Math.cos(i / 17) * 0.4) * 0.8;
    v += (Math.random() - 0.5) * 0.35;
    median.push(v);
  }
  const p80w = median.map((_, i) => 4.5 + Math.sin(i / 10) * 0.7);
  const upper80 = median.map((m, i) => m + p80w[i]);
  const lower80 = median.map((m, i) => m - p80w[i]);
  return { xs, median, upper80, lower80 };
}

export default function HeroStreamGraph() {
  const data = useMemo(() => genSeries(96), []);
  const streams = useMemo(() => prepareStreams(data), [data]);
  const width = 800;
  const height = 360;
  const margin = { top: 0, right: 0, bottom: 0, left: 0 };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  const xScale = (v: number) => (v / data.xs.length) * xMax;
  const yScale = (v: number) => yMax - (v / Math.max(...data.median) * yMax);

  return (
    <motion.svg
      width={width}
      height={height}
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 2, ease: "easeInOut" }}
      className="w-full h-[360px] rounded-2xl border border-[#1B2431] bg-[#0E1420]/70 backdrop-blur-md"
      style={{ boxShadow: "0 0 40px rgba(52,211,153,0.15)" }}
    >
      <defs>
        <LinearGradient
          id="streamGradient"
          from="rgba(52,211,153,0.4)"
          fromOpacity={0.6}
          to="rgba(125,211,252,0.2)"
          toOpacity={0.3}
          vertical={false}
        />
      </defs>
      {streams.map((stream, i) => (
        <g key={stream.id}>
          <AreaClosed
            data={stream.values}
            x={(d: any) => xScale(d.x)}
            y={(d: any) => yScale(d.y0)}
            yScale={yScale}
            y0={(d: any) => yScale(d.y1)}
            fill={`url(#streamGradient)`}
            curve={curveMonotoneX}
            strokeWidth={1}
            stroke="rgba(249,248,243,0.5)"
          />
        </g>
      ))}
      {/* Overlay glow */}
      <rect width={width} height={height} fill="url(#streamGradient)" opacity={0.1} />
    </motion.svg>
  );
}