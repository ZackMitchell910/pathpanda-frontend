"use client";

import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
  type ChartOptions,
} from "chart.js";
import { getRelativePosition } from "chart.js/helpers";
import { GOLD } from "@/theme/chartTheme";

ChartJS.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

type MCArtifact = {
  symbol: string;
  horizon_days: number;
  median_path: [number, number][];
  bands: {
    p50: [number, number][];
    p80_low: [number, number][];
    p80_high: [number, number][];
    p95_low: [number, number][];
    p95_high: [number, number][];
  };
};

const GOLD_GLOW = "rgba(203,161,53,0.28)"; // soft halo
const BAND80 = "rgba(203,161,53,0.12)";     // gold-tinted action band
const BAND95 = "rgba(255,255,255,0.07)";    // neutral uncertainty

type FanProps = { data?: MCArtifact; artifact?: MCArtifact };

export default function FanChart({ data, artifact }: FanProps) {
  const a = (data ?? artifact) as MCArtifact | undefined;
  if (!a || !Array.isArray(a.median_path) || !a.median_path.length || !a.bands) {
    return <div className="text-xs opacity-70">Run a simulation to view.</div>;
  }

  const { symbol, horizon_days, median_path, bands } = a;

  const labels = median_path.map(([i]) => `D${i}`);
  const yMedian = median_path.map(([, v]) => v);
  const y80Low = bands.p80_low.map(([, v]) => v);
  const y80High = bands.p80_high.map(([, v]) => v);
  const y95Low = bands.p95_low.map(([, v]) => v);
  const y95High = bands.p95_high.map(([, v]) => v);

  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const [hoverBand, setHoverBand] = React.useState<"p80" | "p95" | null>(null);
  const chartRef = React.useRef<ChartJS<"line"> | null>(null);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  // Datasets: back-to-front fill order. Duplicate median for glow.
  const chartData = {
    labels,
    datasets: [
      {
        label: "95% band",
        data: y95High,
        borderWidth: 0,
        backgroundColor: BAND95,
        fill: { target: 2, above: BAND95, below: BAND95 },
        pointRadius: 0,
      },
      {
        label: "80% band",
        data: y80High,
        borderWidth: 0,
        backgroundColor: BAND80,
        fill: { target: 3, above: BAND80, below: BAND80 },
        pointRadius: 0,
      },
      { label: "_95_low", data: y95Low, borderWidth: 0, pointRadius: 0 },
      { label: "_80_low", data: y80Low, borderWidth: 0, pointRadius: 0 },

      // Gold glow (thick, translucent)
      {
        label: "MedianGlow",
        data: yMedian,
        borderColor: GOLD_GLOW,
        borderWidth: 6,
        pointRadius: 0,
        tension: 0.16,
      },
      // Crisp gold median
      {
        label: "Median",
        data: yMedian,
        borderColor: GOLD,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.16,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxRotation: 0 },
        title: { display: true, text: "Days", color: "#C7C9D1" },
      },
      y: { title: { display: true, text: "Price", color: "#C7C9D1" } },
    },
    // @ts-ignore
    onHover: (e, _els, chart) => {
      const scales: any = (chart as any).scales;
      const x = scales?.x, y = scales?.y;
      if (!x || !y) return;
      const pos = getRelativePosition((e as any).native ?? e, chart as any);
      const xVal = x.getValueForPixel(pos.x);
      const yVal = y.getValueForPixel(pos.y);
      if (xVal == null || yVal == null || !Number.isFinite(xVal) || !Number.isFinite(yVal)) {
        setHoverIdx(null); setHoverBand(null); return;
      }
      const idx = clamp(Math.round(Number(xVal)), 0, labels.length - 1);
      const y80L = y80Low[idx], y80H = y80High[idx], y95L = y95Low[idx], y95H = y95High[idx];

      let band: "p80" | "p95" | null = null;
      if (y80L != null && y80H != null && yVal >= y80L && yVal <= y80H) band = "p80";
      else if (y95L != null && y95H != null && yVal >= y95L && yVal <= y95H) band = "p95";

      setHoverIdx(idx); setHoverBand(band);
      const canvas = (chart as any).canvas as HTMLCanvasElement;
      if (canvas) canvas.style.cursor = "crosshair";
    },
  };

  // Overlay crosshair + band tag (gold outline when on 80%)
  const hoverPlugin = {
    id: "fanHoverOverlay",
    afterDraw: (chart: any) => {
      if (hoverIdx == null) return;
      const { ctx, chartArea, scales } = chart;
      const x = scales?.x, y = scales?.y;
      if (!x || !y) return;

      const xPix = x.getPixelForValue(hoverIdx);
      ctx.save();
      ctx.strokeStyle = "rgba(148,163,184,0.45)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xPix, chartArea.top);
      ctx.lineTo(xPix, chartArea.bottom);
      ctx.stroke();

      if (hoverBand) {
        const tag = hoverBand === "p80" ? "80% band" : "95% band";
        const pad = 6;
        const textX = Math.min(Math.max(xPix + 8, chartArea.left + 4), chartArea.right - 104);
        const textY = chartArea.top + 8;
        ctx.font = "12px ui-sans-serif, system-ui, -apple-system";
        ctx.fillStyle = "rgba(0,0,0,0.92)";
        const w = ctx.measureText(tag).width + pad * 2;
        ctx.fillRect(textX, textY, w, 18);
        ctx.strokeStyle = hoverBand === "p80" ? GOLD : "rgba(255,255,255,0.28)";
        ctx.strokeRect(textX, textY, w, 18);
        ctx.fillStyle = "#E5E7EB";
        ctx.fillText(tag, textX + pad, textY + 13);
      }
      ctx.restore();
    },
  };

  React.useEffect(() => {
    const c = chartRef.current?.canvas as HTMLCanvasElement | undefined | null;
    if (!c) return;
    const onLeave = () => { setHoverIdx(null); setHoverBand(null); c.style.cursor = "default"; };
    c.addEventListener("mouseleave", onLeave);
    return () => c.removeEventListener("mouseleave", onLeave);
  }, []);

  return (
    <div data-chart="fan" className="relative w-full overflow-hidden" style={{ height: 360 }}>
      <Line
        ref={chartRef}
        data={chartData}
        options={options}
        plugins={[hoverPlugin]}
        role="img"
        aria-label={`Fan chart for ${symbol} over ${horizon_days} days with median, 80% and 95% bands`}
      />
    </div>
  );
}
