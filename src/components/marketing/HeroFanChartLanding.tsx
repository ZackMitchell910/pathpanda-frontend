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
} from "chart.js";
import { motion } from "framer-motion";

Chart.register(LinearScale, LineController, PointElement, LineElement, Tooltip, Filler, CategoryScale);

type Band = "p80" | "p95" | null;

function genSeries(n = 80) {
  // Pretty, smooth demo series: baseline drift + noise
  const xs = Array.from({ length: n }, (_, i) => i);
  let v = 0;
  const median: number[] = [];
  for (let i = 0; i < n; i++) {
    v += (Math.sin(i / 9) * 0.7 + Math.cos(i / 17) * 0.4) * 0.8;
    v += (Math.random() - 0.5) * 0.35;
    median.push(v);
  }
  // Build symmetric bands around median
  const p80w = median.map((_, i) => 4.5 + Math.sin(i / 10) * 0.7);
  const p95w = median.map((_, i) => 8 + Math.cos(i / 13) * 1.1);

  const upper80 = median.map((m, i) => m + p80w[i]);
  const lower80 = median.map((m, i) => m - p80w[i]);
  const upper95 = median.map((m, i) => m + p95w[i]);
  const lower95 = median.map((m, i) => m - p95w[i]);

  return { xs, median, upper80, lower80, upper95, lower95 };
}

function genParticles(median: number[], count: number) {
  return Array.from({ length: count }, (_, i) => ({
    x: Math.random() * 1000, // Scaled to chart width
    y: median[Math.floor(Math.random() * median.length)] + (Math.random() - 0.5) * 10,
    vy: (Math.random() - 0.5) * 0.5,
    alpha: Math.random() * 0.5 + 0.2,
    hue: 120 + Math.random() * 60, // Green-cyan range
  }));
}

export default function HeroFanChart() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const [hovered, setHovered] = useState<Band>(null);
  const [particles, setParticles] = useState<any[]>([]);

  const data = useMemo(() => genSeries(96), []);
  const particleData = useMemo(() => genParticles(data.median, 50), [data.median]);

  // Custom painter plugin draws: p95 band, p80 band (on top), then median line, with pulsing.
  const painter = useMemo(() => {
    let pulseTime = 0;
    return {
      id: "fanPainter",
      afterDraw: (c: Chart) => {
        const { ctx, chartArea, scales } = c as any;
        if (!chartArea || !scales.x || !scales.y) return;

        pulseTime += 0.05; // Increment for pulse
        const pulse = Math.sin(pulseTime) * 0.1 + 0.9; // Oscillate 0.8-1.0

        const x = scales.x;
        const y = scales.y;

        const {
          xs,
          median,
          upper80,
          lower80,
          upper95,
          lower95,
        } = data;

        const drawBand = (
          upper: number[],
          lower: number[],
          fill: string,
          opacity: number
        ) => {
          ctx.save();
          ctx.globalAlpha = opacity * pulse; // Pulsing effect
          ctx.beginPath();
          // upper path
          for (let i = 0; i < xs.length; i++) {
            const px = x.getPixelForValue(xs[i]);
            const py = y.getPixelForValue(upper[i]);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          // lower path (reverse)
          for (let i = xs.length - 1; i >= 0; i--) {
            const px = x.getPixelForValue(xs[i]);
            const py = y.getPixelForValue(lower[i]);
            ctx.lineTo(px, py);
          }
          ctx.closePath();

          const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          // subtle vertical glow
          g.addColorStop(0, fill.replace("OP", (0.18 * opacity).toString()));
          g.addColorStop(1, fill.replace("OP", (0.06 * opacity).toString()));
          ctx.fillStyle = g;
          ctx.fill();
          ctx.restore();
        };

        // Base bands with hover adjustments
        const p95Opacity = hovered === "p95" ? 1.0 : hovered === "p80" ? 0.65 : 0.85;
        const p80Opacity = hovered === "p80" ? 1.0 : 0.9;

        // p95 (emerald-cyan deep)
        drawBand(
          upper95,
          lower95,
          "rgba(125,211,252,OP)", // cyan-ish with OP
          p95Opacity
        );

        // p80 (emerald)
        drawBand(
          upper80,
          lower80,
          "rgba(52,211,153,OP)",
          p80Opacity
        );

        // Median line (ivory) with glow
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < xs.length; i++) {
          const px = x.getPixelForValue(xs[i]);
          const py = y.getPixelForValue(median[i]);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = "#F9F8F3";
        ctx.lineWidth = 2 * pulse; // Pulsing thickness
        ctx.shadowColor = "rgba(249,248,243,0.35)";
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.restore();

        // Particle overlay
        particles.forEach(p => {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      },
    };
  }, [data, hovered, particles]);

  useEffect(() => {
    setParticles(particleData);
  }, [particleData]);

  // Animate particles
  useEffect(() => {
    const animate = () => {
      setParticles(prev => 
        prev.map(p => ({
          ...p,
          y: p.y + p.vy,
          alpha: Math.max(0.1, p.alpha - 0.005), // Fade trails
          x: p.x + (Math.random() - 0.5) * 0.5, // Subtle horizontal drift
        })).filter(p => p.alpha > 0.1) // Remove faded particles
      );
      requestAnimationFrame(animate);
    };
    animate();
  }, []);

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
          x: {
            display: false,
            type: "linear",
            min: data.xs[0],
            max: data.xs[data.xs.length - 1],
          },
          y: {
            display: false,
            grace: "15%",
          },
        },
        events: ["mousemove", "mouseout", "touchmove", "touchstart", "touchend"],
        onHover: (_e, _el, chart) => {
          // Determine band under cursor by comparing distance to p80 vs p95 envelopes
          const { scales } = chart as any;
          const xScale = scales.x, yScale = scales.y;
          const pos = _e.native;
          if (!xScale || !yScale || !pos) return setHovered(null);

          const xVal = xScale.getValueForPixel(pos.x);
          if (xVal == null) return setHovered(null);

          // find nearest index
          const idx = Math.max(
            0,
            Math.min(data.xs.length - 1, Math.round(Number(xVal)))
          );

          const yPx = pos.y;
          const yVal = yScale.getValueForPixel(yPx);

          const within95 =
            yVal <= data.upper95[idx] && yVal >= data.lower95[idx];
          const within80 =
            yVal <= data.upper80[idx] && yVal >= data.lower80[idx];

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
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative h-[360px] w-full rounded-2xl border border-[#1B2431] bg-[#0E1420]/70 backdrop-blur-md overflow-hidden"
      style={{
        boxShadow: "0 0 40px rgba(52,211,153,0.15)",
      }}
      whileHover={{ scale: 1.02 }} // Subtle zoom on hover
    >
      <canvas ref={canvasRef} />
      {/* Glow edge with enhanced radial gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_20%,rgba(52,211,153,0.12)_0%,transparent_60%)]" />
      {/* Scenario bubbles on hover (placeholder for tooltips) */}
      {hovered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-4 right-4 bg-black/80 text-white px-3 py-1 rounded-lg text-xs"
        >
          {hovered === "p80" ? "80% Confidence" : "95% Uncertainty"}
        </motion.div>
      )}
    </motion.div>
  );
}