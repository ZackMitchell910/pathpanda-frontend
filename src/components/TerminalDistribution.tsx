// =============================================
// File: src/components/TerminalDistribution.tsx
// Neutral histogram for terminal prices (no amber)
// =============================================
import React, { useEffect, useMemo, useRef } from "react";
import { Chart, ChartOptions } from "chart.js/auto";

export default function TerminalDistribution({ prices }: { prices: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const hist = useMemo(() => buildHistogram(prices, 30), [prices]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const options: ChartOptions<"bar"> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: {
          ticks: { color: "rgba(255,255,255,0.6)" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "rgba(255,255,255,0.6)" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(17,17,17,0.95)",
          titleColor: "#fff",
          bodyColor: "#e5e7eb",
          borderColor: "rgba(255,255,255,0.12)",
          borderWidth: 1,
          callbacks: {
            title: (items) => items[0]?.label || "",
            label: (ctx) => ` Count: ${ctx.parsed.y}`,
          },
        },
      },
    };

    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: hist.labels,
        datasets: [
          {
            label: "Histogram",
            data: hist.counts,
            backgroundColor: "rgba(255,255,255,0.25)",
            borderColor: "rgba(255,255,255,0.4)",
            borderWidth: 1,
            barPercentage: 1.0,
            categoryPercentage: 1.0,
          },
        ],
      },
      options,
    });

    chartRef.current = chart;
    return () => { chart.destroy(); chartRef.current = null; };
  }, [hist]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

function buildHistogram(values: number[], binCount = 30): { labels: string[]; counts: number[] } {
  const xs = (Array.isArray(values) ? values : []).filter((v) => typeof v === "number" && Number.isFinite(v));
  if (!xs.length) return { labels: [], counts: [] };
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const span = max - min || 1;
  const bins = Math.max(5, Math.min(100, binCount));
  const step = span / bins;
  const counts = new Array(bins).fill(0);
  for (const v of xs) {
    const i = Math.min(bins - 1, Math.max(0, Math.floor((v - min) / step)));
    counts[i]++;
  }
  const labels = Array.from({ length: bins }, (_, i) => {
    const a = min + i * step;
    const b = a + step;
    return `${formatNum(a)} – ${formatNum(b)}`;
  });
  return { labels, counts };
}

function formatNum(n: number) {
  return Number(n).toFixed(2);
}