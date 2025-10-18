import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, RotateCw, Activity, LineChart as LineChartIcon, Settings, Download, Sparkles, BarChart3, Zap, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

/**
 * This mock uses lightweight-charts for a true candlestick experience
 * with a dashed/ghost projection and an uncertainty band.
 * Install:
 *   npm i lightweight-charts
 */
import { createChart, ColorType, CrosshairMode } from "lightweight-charts";

// ------------------------------------------------------------
// Mock data helpers
// ------------------------------------------------------------

function seedRand(seed = 42) {
  let s = seed >>> 0;
  return function() {
    // xorshift32
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function randn(rng: () => number) {
  // Box-Muller
  const u = 1 - rng();
  const v = 1 - rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function genPathOHLC(n = 120, start = 100, seed = 42) {
  const rng = seedRand(seed);
  let p = start;
  const out: any[] = [];
  for (let i = 0; i < n; i++) {
    const r = 0.0005 + 0.01 * randn(rng); // drift + noise
    const next = Math.max(0.01, p * Math.exp(r));
    const open = p;
    const close = next;
    const high = Math.max(open, close) * (1 + (0.002 + 0.002 * rng()));
    const low = Math.min(open, close) * (1 - (0.002 + 0.002 * rng()));
    out.push({ time: i + 1, open, high, low, close });
    p = next;
  }
  return out;
}

function projectPath(base: any[], steps = 40, seed = 99) {
  const last = base.at(-1);
  if (!last) return [];
  const rng = seedRand(seed);
  let p = last.close;
  const arr: any[] = [];
  for (let i = 1; i <= steps; i++) {
    const r = 0.0005 + 0.012 * randn(rng);
    const next = Math.max(0.01, p * Math.exp(r));
    const open = p;
    const close = next;
    const high = Math.max(open, close) * (1 + (0.003 + 0.002 * rng()));
    const low = Math.min(open, close) * (1 - (0.003 + 0.002 * rng()));
    arr.push({ time: (last.time as number) + i, open, high, low, close });
    p = next;
  }
  return arr;
}

function percentileBands(anchor: number, steps = 40, seed = 123) {
  const rng = seedRand(seed);
  const p10: any[] = [], p90: any[] = [];
  let a10 = anchor, a90 = anchor;
  for (let i = 1; i <= steps; i++) {
    const s = 0.008 * Math.abs(randn(rng));
    a10 = Math.max(0.01, a10 * Math.exp(-s));
    a90 = a90 * Math.exp(+s);
    p10.push({ time: i, value: a10 });
    p90.push({ time: i, value: a90 });
  }
  return { p10, p90 };
}

// ------------------------------------------------------------
// Candlestick chart wrapper (realized + projection + band)
// ------------------------------------------------------------

function CandleChart({ realized, projection, showProjection, band }: { realized: any[]; projection: any[]; showProjection: boolean; band: { p10: any[]; p90: any[] } | null; }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const seriesRealRef = useRef<any>(null);
  const seriesProjRef = useRef<any>(null);
  const bandLowRef = useRef<any>(null);
  const bandHighRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#0a0a0a" }, textColor: "#b3b3b3" },
      grid: { vertLines: { color: "#1f2937" }, horzLines: { color: "#1f2937" } },
      rightPriceScale: { borderColor: "#374151" },
      timeScale: { borderColor: "#374151" },
      crosshair: { mode: CrosshairMode.Normal },
      localization: { priceFormatter: p => p.toFixed(2) },
      autoSize: true,
    });
    chartRef.current = chart;

    const seriesReal = chart.addCandlestickSeries({ upColor: "#22c55e", downColor: "#ef4444", borderVisible: true, wickUpColor: "#22c55e", wickDownColor: "#ef4444" });
    seriesRealRef.current = seriesReal;

    const seriesProj = chart.addCandlestickSeries({ upColor: "#a78bfa", downColor: "#a78bfa", borderColor: "#a78bfa", wickUpColor: "#a78bfa", wickDownColor: "#a78bfa" });
    seriesProj.applyOptions({
      priceScaleId: "right",
      // a visual trick: we draw lighter by setting transparency via invisible bars + overlay area beneath
    });
    seriesProjRef.current = seriesProj;

    const low = chart.addAreaSeries({ lineColor: "rgba(99,102,241,0.6)", topColor: "rgba(99,102,241,0.15)", bottomColor: "rgba(99,102,241,0.02)", lineWidth: 1 });
    const high = chart.addAreaSeries({ lineColor: "rgba(99,102,241,0.6)", topColor: "rgba(99,102,241,0.15)", bottomColor: "rgba(99,102,241,0.02)", lineWidth: 1 });
    bandLowRef.current = low;
    bandHighRef.current = high;

    const handle = () => chart.timeScale().fitContent();
    const ro = new ResizeObserver(handle);
    ro.observe(containerRef.current);

    return () => { ro.disconnect(); chart.remove(); };
  }, []);

  useEffect(() => {
    if (!seriesRealRef.current) return;
    seriesRealRef.current.setData(realized);
  }, [realized]);

  useEffect(() => {
    if (!seriesProjRef.current) return;
    if (showProjection) {
      seriesProjRef.current.setData(projection);
    } else {
      seriesProjRef.current.setData([]);
    }
  }, [projection, showProjection]);

  useEffect(() => {
    if (!bandLowRef.current || !bandHighRef.current) return;
    if (showProjection && band) {
      // Align band time to projection start
      const t0 = projection[0]?.time ?? realized.at(-1)?.time ?? 0;
      const low = band.p10.map((d) => ({ time: t0 + d.time, value: d.value }));
      const high = band.p90.map((d) => ({ time: t0 + d.time, value: d.value }));
      bandLowRef.current.setData(low);
      bandHighRef.current.setData(high);
    } else {
      bandLowRef.current.setData([]);
      bandHighRef.current.setData([]);
    }
  }, [band, projection, realized, showProjection]);

  const downloadPng = useCallback(() => {
    const el = containerRef.current?.querySelector('canvas');
    if (!el) return;
    const url = (el as HTMLCanvasElement).toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url; a.download = "price.png"; a.click();
  }, []);

  return (
    <div className="relative">
      <div ref={containerRef} className="h-72 w-full" />
      <div className="absolute right-2 top-2 flex items-center gap-2">
        <Button size="sm" variant="outline" className="border-neutral-700" onClick={downloadPng}><Download className="mr-2 h-4 w-4"/>PNG</Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Main Dashboard
// ------------------------------------------------------------

export default function DashboardMock() {
  const [mode, setMode] = useState("backtest");
  const [running, setRunning] = useState(false);
  const [seed, setSeed] = useState("42");
  const [cfgHash] = useState("b70f45809752");
  const [paperOnly, setPaperOnly] = useState(false);
  const [source, setSource] = useState("mc_gan");
  const [shock, setShock] = useState(0);
  const [liq, setLiq] = useState(2000);
  const [spread, setSpread] = useState(5);
  const [showFuture, setShowFuture] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const realized = useMemo(() => genPathOHLC(80, 100, Number(seed)), [seed]);
  const [liveIdx, setLiveIdx] = useState(40);
  const realizedSlice = useMemo(() => realized.slice(0, liveIdx), [realized, liveIdx]);
  const projection = useMemo(() => projectPath(realizedSlice, 40, Number(seed) + 7), [realizedSlice, seed]);
  const band = useMemo(() => {
    const anchor = realizedSlice.at(-1)?.close ?? 100;
    return percentileBands(anchor, 40, Number(seed) + 17);
  }, [realizedSlice, seed]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLiveIdx((i) => Math.min(realized.length, i + 1)), 200);
    return () => clearInterval(id);
  }, [running, realized.length]);

  // ----------------------------------------------------------
  // UI
  // ----------------------------------------------------------

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-emerald-400" />
            <span className="font-semibold">MarketTwin ▸ Simulator</span>
            <Badge variant="secondary" className="ml-2">cfg: {cfgHash}</Badge>
            <Badge variant="outline">seed: {seed}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="w-[120px] bg-neutral-900 border-neutral-800">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 text-neutral-100 border-neutral-800">
                <SelectItem value="backtest">Backtest</SelectItem>
                <SelectItem value="live">Live</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant={running ? "secondary" : "default"} onClick={() => setRunning((r) => !r)}>
              {running ? <><Pause className="mr-2 h-4 w-4" />Pause</> : <><Play className="mr-2 h-4 w-4" />Start</>}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setRunning(false); setLiveIdx(40); }}>
              <RotateCw className="mr-2 h-4 w-4" />Reset
            </Button>
            <div className="flex items-center gap-2 pl-3">
              <span className="text-xs text-neutral-400">Paper-only</span>
              <Switch checked={paperOnly} onCheckedChange={setPaperOnly} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="mx-auto grid max-w-7xl grid-cols-12 gap-4 p-4">
        {/* Left rail */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader>
              <CardTitle className="text-sm text-neutral-300">Scenarios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {["Baseline","Stress +3%","Liquidity ↑","News spike"].map((s) => (
                <Button key={s} variant="outline" className="w-full justify-start border-neutral-800 hover:bg-neutral-800">{s}</Button>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader>
              <CardTitle className="text-sm text-neutral-300">Agents</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              {[ ["Fund", true], ["Retail", true], ["ARK", true], ["RL (beta)", false] ].map(([name, on]) => (
                <div key={name as string} className="flex items-center justify-between rounded-md border border-neutral-800 px-2 py-1">
                  <span>{name as string}</span>
                  <Switch defaultChecked={!!on} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader>
              <CardTitle className="text-sm text-neutral-300">Risk Rails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span>Affordability</span><Switch defaultChecked /></div>
              <div className="flex items-center justify-between"><span>Order caps</span><Switch defaultChecked /></div>
              <div className="flex items-center justify-between"><span>Impact clamp</span><Switch defaultChecked /></div>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="col-span-12 lg:col-span-9 space-y-4">
          {/* Price Panel */}
          <Card className="bg-neutral-900 border-neutral-800 relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-neutral-300 flex items-center gap-2"><LineChartIcon className="h-4 w-4" /> Price (Candles + Projection)</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="w-[140px] bg-neutral-900 border-neutral-800">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 text-neutral-100 border-neutral-800">
                    <SelectItem value="mc">MC</SelectItem>
                    <SelectItem value="gan">GAN</SelectItem>
                    <SelectItem value="mc_gan">MC+GAN</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <span>Show future</span><Switch checked={showFuture} onCheckedChange={setShowFuture} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CandleChart realized={realizedSlice} projection={projection} showProjection={showFuture} band={band} />
            </CardContent>
          </Card>

          {/* PnL & Risk */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[{t:"FUND", pnl:"+3.7k", dd:"-4.5%"}, {t:"RETAIL", pnl:"-1.3k", dd:"-2.1%"}, {t:"ARK", pnl:"-0.8k", dd:"-0.9%"}].map((k) => (
              <Card key={k.t} className="bg-neutral-900 border-neutral-800">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-neutral-300">{k.t}</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-24 flex items-center justify-between">
                    <div className="text-2xl font-semibold">{k.pnl}</div>
                    <div className="text-xs text-neutral-400">DD {k.dd}</div>
                  </div>
                  <div className="text-xs text-neutral-500">Live metrics placeholder</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Lower grid: Orders, ARK Inspector, What-if, ML */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm text-neutral-300">Orders & Fills</CardTitle>
                <div className="flex items-center gap-2">
                  <Input placeholder="Filter…" className="h-8 w-40 bg-neutral-900 border-neutral-800 text-sm" />
                  <Button size="sm" variant="outline" className="border-neutral-800"><Download className="mr-2 h-4 w-4"/>Export</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-40 overflow-auto space-y-1 text-sm">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border border-neutral-800 px-2 py-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={i%2?"default":"destructive"}>{i%2?"BUY":"SELL"}</Badge>
                        <span className="text-neutral-300">{i%3===0?"ARK":i%3===1?"FUND":"RETAIL"}</span>
                      </div>
                      <div className="text-neutral-400">{(100+Math.random()*2).toFixed(2)} @ {(1+Math.random()*30).toFixed(0)}</div>
                      <span className="text-neutral-500">09:3{i}:1{i%10}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-neutral-300">Institutional (ARK)</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="text-neutral-400">Snapshot: <Badge className="ml-2">TSLA 7.5%</Badge> <Badge className="ml-2">NVDA 9.0%</Badge> <Badge className="ml-2">ROKU 3.0%</Badge></div>
                <div>
                  <div className="mb-1 flex items-center justify-between"><span>TSLA Target vs Actual</span><span className="text-neutral-400 text-xs">7.5% | 5.8%</span></div>
                  <div className="h-2 w-full rounded bg-neutral-800">
                    <div className="h-2 rounded bg-emerald-500" style={{ width: "58%" }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-md border border-neutral-800 p-2">aum× <span className="text-neutral-300">1.0</span></div>
                  <div className="rounded-md border border-neutral-800 p-2">per-tick <span className="text-neutral-300">25</span></div>
                  <div className="rounded-md border border-neutral-800 p-2">max symbol <span className="text-neutral-300">10%</span></div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-neutral-300">What‑If Scenario</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-24 text-sm text-neutral-300">Shock</span>
                  <Slider value={[shock]} onValueChange={(v)=>setShock(v[0])} min={-5} max={5} step={0.5} className="w-full" />
                  <span className="w-12 text-right text-xs text-neutral-400">{shock}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-24 text-sm text-neutral-300">Spread</span>
                  <Slider value={[spread]} onValueChange={(v)=>setSpread(v[0])} min={1} max={30} step={1} className="w-full" />
                  <span className="w-12 text-right text-xs text-neutral-400">{spread} bps</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-24 text-sm text-neutral-300">Liquidity</span>
                  <Slider value={[liq]} onValueChange={(v)=>setLiq(v[0])} min={500} max={10000} step={100} className="w-full" />
                  <span className="w-16 text-right text-xs text-neutral-400">{liq}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm">Apply</Button>
                  <Button size="sm" variant="outline" className="border-neutral-800">Reset</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-2 flex items-center justify-between">
                <CardTitle className="text-sm text-neutral-300">ML Diagnostics</CardTitle>
                <Badge variant="outline" className="text-xs">GAN active (80/20)</Badge>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2 text-sm">
                {[{ k: "KS p", v: "0.41" }, { k: "ACF(1) Δ", v: "0.02" }, { k: "Vol Δ", v: "0.3%" }].map((m) => (
                  <div key={m.k} className="rounded-md border border-neutral-800 p-3">
                    <div className="text-neutral-400">{m.k}</div>
                    <div className="text-lg">{m.v}</div>
                  </div>
                ))}
                <div className="col-span-3 mt-2">
                  <Button size="sm" variant="ghost" className="text-xs text-neutral-400" onClick={() => setAdvancedOpen((o)=>!o)}>
                    <Settings className="mr-2 h-4 w-4" /> Advanced {advancedOpen ? "▲" : "▼"}
                  </Button>
                  {advancedOpen && (
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-md border border-neutral-800 p-2">Blend: <span className="text-neutral-300">MC 80 / GAN 20</span></div>
                      <div className="rounded-md border border-neutral-800 p-2">KS target ≥ 0.2</div>
                      <div className="rounded-md border border-neutral-800 p-2">Impact clamp tanh(imb/liq)</div>
                      <div className="rounded-md border border-neutral-800 p-2">RL: Sharpe reward + penalty</div>
                      <div className="rounded-md border border-neutral-800 p-2">Seed: <span className="text-neutral-300">{seed}</span></div>
                      <div className="rounded-md border border-neutral-800 p-2">Cfg: <span className="text-neutral-300">{cfgHash.slice(0,8)}</span></div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
