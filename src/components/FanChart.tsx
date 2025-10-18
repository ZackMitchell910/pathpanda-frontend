// =============================================
// File: src/components/FanChart.tsx
// Mode-aware fan chart with MAP path & jump markers
// =============================================
import React, { useEffect, useMemo, useRef } from "react";
import Chart from "chart.js/auto";
import type { Chart as ChartJS, ChartOptions, Plugin, TooltipItem } from "chart.js";
import type { MCArtifact, PathPoint } from "@/types/simulation";

type EventMarker = {
  day: number;
  label?: string;
  severity?: number;
  type?: string;
};

const GRID = "rgba(255,255,255,0.08)";
const AXIS = "rgba(255,255,255,0.38)";
const P95 = "rgba(255,255,255,0.07)"; // widest band
const P80 = "rgba(255,255,255,0.15)"; // mid band
const P68 = "rgba(250,204,21,0.18)"; // mode-aware band
const MEDIAN = "#E5E7EB"; // soft white
const MAP_COLOR = "#FACC15"; // MAP/MAP path highlight
const JUMP_MARKER = "#38BDF8";

export default function FanChart({ artifact }: { artifact: MCArtifact }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartJS | null>(null);

  const dataSeries = useMemo(() => {
    const sanitizePoints = (points?: PathPoint[]) =>
      Array.isArray(points)
        ? points.filter(
            (pt): pt is PathPoint =>
              Array.isArray(pt) &&
              pt.length >= 2 &&
              Number.isFinite(pt[0]) &&
              Number.isFinite(pt[1])
          )
        : [];

    const medianPoints = sanitizePoints(artifact?.median_path);
    const xs = medianPoints.map(([d]) => d);
    const median = medianPoints.map(([, y]) => y);

    const alignSeries = (points?: PathPoint[], fallback?: number[]) => {
      if (!xs.length) return [] as number[];
      const sanitized = sanitizePoints(points);
      if (!sanitized.length) {
        if (fallback && fallback.length === xs.length) return fallback;
        return xs.map((_, i) => (Number.isFinite(median[i]) ? median[i] : 0));
      }
      const indexed = new Map<number, number>();
      sanitized.forEach(([idx, value]) => {
        if (Number.isFinite(idx) && Number.isFinite(value)) {
          indexed.set(idx, value);
        }
      });
      return xs.map((x, i) => {
        const value = indexed.get(x);
        if (Number.isFinite(value)) return value as number;
        if (fallback && Number.isFinite(fallback[i])) return fallback[i] as number;
        const fallbackMedian = median[i];
        return Number.isFinite(fallbackMedian) ? fallbackMedian : 0;
      });
    };

    const alignBand = (points?: PathPoint[], fallback?: number[]) => {
      if (!xs.length) return [] as number[];
      const sanitized = sanitizePoints(points);
      if (!sanitized.length) {
        const source = fallback && fallback.length ? fallback : median;
        return xs.map((_, i) => (Number.isFinite(source[i]) ? source[i] : 0));
      }
      const indexed = new Map<number, number>();
      sanitized.forEach(([idx, value]) => {
        if (Number.isFinite(idx) && Number.isFinite(value)) {
          indexed.set(idx, value);
        }
      });
      const source = fallback && fallback.length === xs.length ? fallback : median;
      return xs.map((x, i) => {
        const value = indexed.get(x);
        if (Number.isFinite(value)) return value as number;
        const fallbackValue = source[i];
        return Number.isFinite(fallbackValue) ? fallbackValue : 0;
      });
    };

    const p80L = alignBand(artifact?.bands?.p80_low);
    const p80H = alignBand(artifact?.bands?.p80_high);
    const p95L = alignBand(artifact?.bands?.p95_low);
    const p95H = alignBand(artifact?.bands?.p95_high);

    const mapPath = alignSeries((artifact as any)?.map_path, median);
    const hasMap = mapPath.some((v, idx) => Number.isFinite(v) && v !== median[idx]);

    const modeBandLow = alignBand((artifact as any)?.mode_band?.p68_low, p80L);
    const modeBandHigh = alignBand((artifact as any)?.mode_band?.p68_high, p80H);
    const hasModeBand =
      modeBandLow.length &&
      modeBandHigh.length &&
      modeBandLow.some((v, idx) => v !== p80L[idx]) &&
      modeBandHigh.some((v, idx) => v !== p80H[idx]);

    const mostLikely = Number.isFinite((artifact as any)?.most_likely_price)
      ? Number((artifact as any)?.most_likely_price)
      : null;

    const eventMarkers: EventMarker[] = (() => {
      const xsSet = new Set(xs);
      const markers: EventMarker[] = [];

      const pushMarker = (value: unknown) => {
        if (!value) return;
        if (typeof value === "number" && Number.isFinite(value)) {
          markers.push({ day: value });
        } else if (typeof value === "object") {
          const entry = value as Record<string, unknown>;
          const day = entry.day ?? entry.day_index ?? entry.t ?? entry.x;
          if (typeof day === "number" && Number.isFinite(day)) {
            markers.push({
              day,
              label:
                typeof entry.label === "string"
                  ? entry.label
                  : typeof entry.name === "string"
                  ? entry.name
                  : undefined,
              severity: typeof entry.severity === "number" ? entry.severity : undefined,
              type: typeof entry.type === "string" ? entry.type : undefined,
            });
          }
        }
      };

      const rawMarkers = (artifact as any)?.jump_markers ?? (artifact as any)?.event_markers ?? [];
      if (Array.isArray(rawMarkers)) {
        rawMarkers.forEach(pushMarker);
      }

      const scheduled = (artifact as any)?.scheduled_events ?? [];
      if (Array.isArray(scheduled)) {
        scheduled.forEach(pushMarker);
      }

      const diagnosticScheduler = (artifact as any)?.diagnostics?.scheduler;
      if (Array.isArray(diagnosticScheduler)) {
        diagnosticScheduler.forEach((item: any) => {
          if (typeof item?.day === "number") {
            pushMarker(item);
          }
        });
      }

      return markers.filter((m) => xsSet.has(Math.round(m.day)));
    })();

    return {
      xs,
      median,
      p80L,
      p80H,
      p95L,
      p95H,
      mapPath,
      hasMap,
      modeBandLow,
      modeBandHigh,
      hasModeBand,
      mostLikely,
      eventMarkers,
    };
  }, [artifact]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    // Clean up previous
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const {
      xs,
      median,
      p80L,
      p80H,
      p95L,
      p95H,
      mapPath,
      hasMap,
      modeBandLow,
      modeBandHigh,
      hasModeBand,
      mostLikely,
      eventMarkers,
    } = dataSeries;

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
        if (hasModeBand) {
          drawBand(modeBandLow, modeBandHigh, P68);
        }

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
      afterDatasetsDraw(c) {
        const { ctx, chartArea } = c;
        const xScale: any = c.scales.x;
        const yScale: any = c.scales.y;

        if (mostLikely !== null && xs.length) {
          const lastDay = xs[xs.length - 1];
          const x = xScale.getPixelForValue(lastDay);
          const y = yScale.getPixelForValue(mostLikely);
          ctx.save();
          ctx.fillStyle = MAP_COLOR;
          ctx.strokeStyle = "#0A0A0A";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.font = "11px Inter, system-ui, sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "bottom";
          const yPct =
            xs.length && Number.isFinite(median[0])
              ? ((mostLikely / (median[0] || 1) - 1) * 100)
              : null;
          const label = `Mode $${mostLikely.toFixed(2)}${Number.isFinite(yPct ?? NaN) ? ` (${(yPct as number).toFixed(1)}%)` : ""}`;
          ctx.fillStyle = "rgba(250,204,21,0.9)";
          ctx.fillText(label, x + 8, y - 6);
          ctx.restore();
        }

        if (eventMarkers.length) {
          ctx.save();
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.font = "10px Inter, system-ui, sans-serif";
          eventMarkers.forEach((marker) => {
            const px = xScale.getPixelForValue(marker.day);
            if (px < chartArea.left - 10 || px > chartArea.right + 10) return;
            ctx.strokeStyle = JUMP_MARKER;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px, chartArea.top);
            ctx.lineTo(px, chartArea.bottom);
            ctx.stroke();

            ctx.fillStyle = "#0A0A0A";
            ctx.beginPath();
            ctx.arc(px, chartArea.top + 10, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = JUMP_MARKER;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px, chartArea.top + 10, 6, 0, Math.PI * 2);
            ctx.stroke();

            if (marker.label) {
              ctx.fillStyle = "rgba(255,255,255,0.8)";
              ctx.fillText(marker.label, px, chartArea.top + 20);
            }
          });
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
          ...(hasMap
            ? [
                {
                  label: "MAP Path",
                  data: mapPath,
                  borderColor: MAP_COLOR,
                  backgroundColor: MAP_COLOR,
                  borderWidth: 1.5,
                  pointRadius: 0,
                  borderDash: [4, 3],
                },
              ]
            : []),
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

