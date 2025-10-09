"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart,
  LinearScale,
  LineController,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  CategoryScale,
  type Chart as ChartType,
} from "chart.js";
import { getRelativePosition } from "chart.js/helpers";

Chart.register(LinearScale, LineController, PointElement, LineElement, Tooltip, Filler, CategoryScale);

type Band = "p80" | "p95" | null;

function genSeries(n = 96) {
  const xs = Array.from({ length: n }, (_, i) => i);
  let v = 0;
  const median: number[] = [];
  for (let i = 0; i < n; i++) {
    v += (Math.sin(i / 9) * 0.7 + Math.cos(i / 17) * 0.4) * 0.8;
    v += (Math.random() - 0.5) * 0.35;
    median.push(v);
  }
  const p80w = median.map((_, i) => 4.5 + Math.sin(i / 10) * 0.7);
  const p95w = median.map((_, i) => 8 + Math.cos(i / 13) * 1.1);

  const upper80 = median.map((m, i) => m + p80w[i]);
  const lower80 = median.map((m, i) => m - p80w[i]);
  const upper95 = median.map((m, i) => m + p95w[i]);
  const lower95 = median.map((m, i) => m - p95w[i]);

  return { xs, median, upper80, lower80, upper95, lower95 };
}

export default function HeroFanChartLanding() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartType | null>(null);
  const [hovered, setHovered] = useState<Band>(null);

  const data = useMemo(() => genSeries(96), []);

  // Custom painter draws p95, then p80, then median line
  const painter = useMemo(() => {
    return {
      id: "fanPainter",
      afterDraw: (c: ChartType) => {
        const anyChart = c as any;
        const { ctx, chartArea, scales } = anyChart;
        if (!chartArea || !scales?.x || !scales?.y) return;

        const x = scales.x;
        const y = scales.y;
        const { xs, median, upper80, lower80, upper95, lower95 } = data;

        const drawBand = (upper: number[], lower: number[], fill: string, opacity: number) => {
          ctx.save();
          ctx.beginPath();
          for (let i = 0; i < xs.length; i++) {
            const px = x.getPixelForValue(xs[i]);
            const py = y.getPixelForValue(upper[i]);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          for (let i = xs.length - 1; i >= 0; i--) {
            const px = x.getPixelForValue(xs[i]);
            const py = y.getPixelForValue(lower[i]);
            ctx.lineTo(px, py);
          }
          ctx.closePath();

          const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, fill.replace("OP", (0.18 * opacity).toString()));
          g.addColorStop(1, fill.replace("OP", (0.06 * opacity).toString()));
          ctx.fillStyle = g;
          ctx.fill();
          ctx.restore();
        };

        const p95Opacity = hovered === "p95" ? 1.0 : hovered === "p80" ? 0.65 : 0.85;
        const p80Opacity = hovered === "p80" ? 1.0 : 0.9;

        // p95 (cyan-ish)
        drawBand(upper95, lower95, "rgba(125,211,252,OP)", p95Opacity);
        // p80 (emerald)
        drawBand(upper80, lower80, "rgba(52,211,153,OP)", p80Opacity);

        // Median line (ivory)
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < xs.length; i++) {
          const px = x.getPixelForValue(xs[i]);
          const py = y.getPixelForValue(median[i]);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = "#F9F8F3";
        ctx.lineWidth = 2;
        ctx.shadowColor = "rgba(249,248,243,0.35)";
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.restore();
      },
    };
  }, [data, hovered]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const c = new Chart(el, {
      type: "line",
      data: {
        labels: data.xs,
        datasets: [
          {
            label: "Median",
            data: data.median,
            borderColor: "transparent",
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: "easeOutCubic" },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false, type: "linear", min: data.xs[0], max: data.xs[data.xs.length - 1] },
          y: { display: false, grace: "15%" },
        },
        events: ["mousemove", "mouseout", "touchmove", "touchstart", "touchend"],
        onHover: (e, _el, chart) => {
          const anyChart = chart as any;
          const xScale = anyChart?.scales?.x;
          const yScale = anyChart?.scales?.y;
          if (!xScale || !yScale) return setHovered(null);

          // Use Chart.js helper to get canvas-relative coords
          const pos = getRelativePosition(e, chart); // { x, y }
          const xVal = xScale.getValueForPixel(pos.x);
          if (xVal == null) return setHovered(null);

          const idx = Math.max(0, Math.min(data.xs.length - 1, Math.round(Number(xVal))));
          const yVal = yScale.getValueForPixel(pos.y);

          const within95 = yVal <= data.upper95[idx] && yVal >= data.lower95[idx];
          const within80 = yVal <= data.upper80[idx] && yVal >= data.lower80[idx];

          if (within80) setHovered("p80");
          else if (within95) setHovered("p95");
          else setHovered(null);
        },
      },
      plugins: [painter],
    });

    chartRef.current = c;
    return () => c.destroy();
  }, [data, painter]);

  return (
    <div
      className="relative h-[360px] w-full rounded-2xl border border-[#1B2431] bg-[#0E1420]/70 backdrop-blur-md overflow-hidden"
      style={{ boxShadow: "0 0 40px rgba(52,211,153,0.15)" }}
    >
      <canvas ref={canvasRef} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_20%,rgba(52,211,153,0.12)_0%,transparent_60%)]" />
    </div>
  );
}
