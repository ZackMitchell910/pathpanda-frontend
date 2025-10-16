// =============================================
// File: src/components/FanChart.tsx
// Palantir-neutral fan chart (no amber; grayscale bands)
// =============================================
import React, { useEffect, useMemo, useRef } from "react";
import Chart from "chart.js/auto";
import type { Chart as ChartJS, ChartOptions, Plugin, TooltipItem } from "chart.js";

type MCArtifact = {
  symbol: string;
  horizon_days: number;
  median_path: [number, number][]; // [dayIndex, price]
  bands: {
    p80_low: [number, number][];
    p80_high: [number, number][];
    p95_low: [number, number][];
    p95_high: [number, number][];
  };
};

const GRID = "rgba(255,255,255,0.08)";
const AXIS = "rgba(255,255,255,0.38)";
const P95 = "rgba(255,255,255,0.07)"; // widest band
const P80 = "rgba(255,255,255,0.15)"; // inner band
const MEDIAN = "#E5E7EB"; // soft white

export default function FanChart({ artifact }: { artifact: MCArtifact }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartJS | null>(null);

  const dataSeries = useMemo(() => {
    const sanitizePoints = (points?: [number, number][]) =>
      Array.isArray(points)
        ? points.filter(
            (pt): pt is [number, number] =>
              Array.isArray(pt) &&
              pt.length >= 2 &&
              Number.isFinite(pt[0]) &&
              Number.isFinite(pt[1])
          )
        : [];

    const medianPoints = sanitizePoints(artifact?.median_path);
    const xs = medianPoints.map(([d]) => d);
    const median = medianPoints.map(([, y]) => y);

    const alignBand = (points?: [number, number][]) => {
      if (!xs.length) return [] as number[];
      const sanitized = sanitizePoints(points);
      if (!sanitized.length) {
        return xs.map((_, i) => (Number.isFinite(median[i]) ? median[i] : 0));
      }
      return xs.map((_, i) => {
        const value = sanitized[i]?.[1];
        if (Number.isFinite(value)) return value as number;
        const fallback = median[i];
        return Number.isFinite(fallback) ? fallback : 0;
      });
    };

    const p80L = alignBand(artifact?.bands?.p80_low);
    const p80H = alignBand(artifact?.bands?.p80_high);
    const p95L = alignBand(artifact?.bands?.p95_low);
    const p95H = alignBand(artifact?.bands?.p95_high);

    return { xs, median, p80L, p80H, p95L, p95H };
  }, [artifact]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    // Clean up previous
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const { xs, median, p80L, p80H, p95L, p95H } = dataSeries;

    // Custom plugin to paint fan bands under the line using direct canvas
    const fanBands: Plugin<"line"> = {
      id: "fanBands",
      beforeDatasetsDraw(c) {
        const { chartArea, ctx } = c;
        const { top, bottom } = chartArea;
        const xScale: any = c.scales.x;
        const yScale: any = c.scales.y;
        if (!xScale || !yScale) return;

        if (!xs.length) return;

        // helper to trace band path between low and high arrays
        function drawBand(low: number[], high: number[], fillStyle: string) {
          ctx.save();
          ctx.beginPath();
          // upper (left -> right)
          xs.forEach((x, i) => {
            const px = xScale.getPixelForValue(x);
            const py = yScale.getPixelForValue(high[i]);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          });
          // lower (right -> left)
          for (let i = xs.length - 1; i >= 0; i--) {
            const px = xScale.getPixelForValue(xs[i]);
            const py = yScale.getPixelForValue(low[i]);
            ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fillStyle = fillStyle;
          ctx.fill();
          ctx.restore();
        }

        // 95% (outer) then 80% (inner) so inner sits above
        drawBand(p95L, p95H, P95);
        drawBand(p80L, p80H, P80);

        // soft vertical rule on hover index (using tooltip active point)
        const active = c.getActiveElements?.()[0];
        if (active) {
          const x = c.scales.x.getPixelForValue(active.index);
          ctx.save();
          ctx.strokeStyle = "rgba(255,255,255,0.25)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, top);
          ctx.lineTo(x, bottom);
          ctx.stroke();
          ctx.restore();
        }
      },
    };

    const options: ChartOptions<"line"> = {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: AXIS, autoSkip: true, maxTicksLimit: 8 },
          grid: { color: GRID },
        },
        y: {
          ticks: { color: AXIS },
          grid: { color: GRID },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: "index",
          intersect: false,
          backgroundColor: "rgba(17,17,17,0.95)",
          titleColor: "#fff",
          bodyColor: "#e5e7eb",
          borderColor: "rgba(255,255,255,0.12)",
          borderWidth: 1,
          callbacks: {
            title: (items: TooltipItem<"line">[]) => `Day ${items?.[0]?.parsed?.x ?? ""}`,
            label: (ctx: TooltipItem<"line">) => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toFixed?.(2)}`,
          },
        },
      },
      elements: { line: { tension: 0.2 } },
    };

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: xs,
        datasets: [
          {
            label: "Median",
            data: median,
            borderColor: MEDIAN,
            backgroundColor: MEDIAN,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      options,
      plugins: [fanBands],
    });

    chartRef.current = chart;

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifact]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

