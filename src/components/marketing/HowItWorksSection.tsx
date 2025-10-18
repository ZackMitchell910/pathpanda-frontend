// src/components/marketing/HowItWorksSection.tsx
import React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Cpu,
  Database,
  LineChart,
  Rocket,
  Lock,
  BarChart3,
  Network,
  Gauge,
  Activity,
  Sigma,
  Binary,
  CircuitBoard,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * HowItWorksSection — Palantir-style narrative walkthrough
 * Monochrome, high-contrast, subtle motion. Uses white aura hovers.
 */

export default function HowItWorksSection() {
  return (
    <section className="relative isolate overflow-hidden bg-black text-white">
      <Noise />
      <Grid />

      <div className="mx-auto max-w-7xl px-6 md:px-8 py-20">
        <header className="text-center mb-12">
          <h2 className="font-brand text-3xl md:text-4xl">How Simetrix Works</h2>
          <p className="mt-3 text-white/70 max-w-3xl mx-auto">
            An end-to-end predictive pipeline: clean market data in, audited forecasts out. Human-in-the-loop optional,
            machine scale by default.
          </p>
        </header>

        {/* Pipeline rail */}
        <PipelineRail />

        {/* Sections */}
        <div className="mt-12 grid grid-cols-1 gap-6">
          <Section
            kicker="01 • Data & Features"
            title="Ingest. Normalize. Enrich."
            icon={<Database className="h-5 w-5" />}
            body={
              <>
                <p>
                  We pull time-series from market data providers and internal sources, then normalize to a common clock.
                  Lightweight transforms populate a feature store (price deltas, realized vol, term structure sketches,
                  liquidity &amp; microstructure signals).
                </p>
                <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-white/70">
                  <li className="flex items-center gap-2"><Bullet /> Polygon.io / REST websockets</li>
                  <li className="flex items-center gap-2"><Bullet /> DuckDB columnar storage</li>
                  <li className="flex items-center gap-2"><Bullet /> Cached snapshots via Redis</li>
                </ul>
              </>
            }
            actions={<SectionActions primaryHref="/docs#data" primary="Data schema" secondaryHref="/docs#features" secondary="Feature catalog" />}
          />

          <Section
            kicker="02 • Learning Loop"
            title="Online updates as data lands"
            icon={<CircuitBoard className="h-5 w-5" />}
            body={
              <>
                <p>
                  Models are updated incrementally (minutes to daily) as new labels arrive. We track drift, cohort
                  performance, and regime shifts without manual babysitting.
                </p>
                <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-white/70">
                  <li className="flex items-center gap-2"><Bullet /> SGD-class and Bayesian mixtures</li>
                  <li className="flex items-center gap-2"><Bullet /> Rolling windows &amp; decay factors</li>
                  <li className="flex items-center gap-2"><Bullet /> Auditable runs &amp; quotas</li>
                </ul>
              </>
            }
            accent={<KPICard label="Update time (p95)" value="380 ms" icon={<Gauge className="h-4 w-4" />} />}
            actions={<SectionActions primaryHref="/docs#learn" primary="Learning API" secondaryHref="/docs#cohorts" secondary="Cohorts & regimes" />}
          />

          <Section
            kicker="03 • Simulation Engine"
            title="Simetrix Quant Engine at machine scale"
            icon={<Cpu className="h-5 w-5" />}
            body={
              <>
                <p>
                  We generate path ensembles with calibrated noise, correlations, and optional jump structures. Outputs
                  include median trajectories, forecast intervals, and hit-probability ladders.
                </p>
                <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-white/70">
                  <li className="flex items-center gap-2"><Bullet /> 10k+ paths / run</li>
                  <li className="flex items-center gap-2"><Bullet /> Fan charts, VaR / ES</li>
                  <li className="flex items-center gap-2"><Bullet /> Deterministic seeds for replays</li>
                </ul>
              </>
            }
            aside={<FanChartSketch />}
            actions={<SectionActions primaryHref="/docs#simulate" primary="Simulate endpoint" secondaryHref="/app" secondary="Run a simulation" />}
          />

          <Section
            kicker="04 • Optional Quantum Sampler"
            title="Indicator probabilities via amplitude sampling"
            icon={<Sigma className="h-5 w-5" />}
            body={
              <>
                <p>
                  For select workloads we compress terminal distributions into small histograms and estimate indicator
                  probabilities (e.g., <em>P(price&gt;s<sub>0</sub>)</em>) using quantum samplers. We default to
                  high-fidelity simulators; IBM Runtime can be enabled per-tenant.
                </p>
                <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-white/70">
                  <li className="flex items-center gap-2"><Bullet /> Qiskit • Aer simulators</li>
                  <li className="flex items-center gap-2"><Bullet /> IBM Runtime (opt-in)</li>
                  <li className="flex items-center gap-2"><Bullet /> Safe fallbacks / parity checks</li>
                </ul>
              </>
            }
            actions={<SectionActions primaryHref="/docs#quantum" primary="Quantum option" secondaryHref="/docs#controls" secondary="Determinism & parity" />}
          />

          <Section
            kicker="05 • Explainability"
            title="Drivers, scenarios, and accountability"
            icon={<BarChart3 className="h-5 w-5" />}
            body={
              <>
                <p>
                  Every forecast ships with interpretable drivers, scenario tiles, and attributions. We focus on what
                  moved the probability mass — not academic internals.
                </p>
                <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-white/70">
                  <li className="flex items-center gap-2"><Bullet /> Factor weights &amp; deltas</li>
                  <li className="flex items-center gap-2"><Bullet /> Backtests &amp; track record</li>
                  <li className="flex items-center gap-2"><Bullet /> CSV/PNG exports for audit</li>
                </ul>
              </>
            }
            actions={<SectionActions primaryHref="/docs#xai" primary="Explainability" secondaryHref="/docs#track" secondary="Track record" />}
          />

          <Section
            kicker="06 • Governance & Access"
            title="Plans, quotas, and strong isolation"
            icon={<ShieldCheck className="h-5 w-5" />}
            body={
              <>
                <p>
                  Per-key plans and daily quotas are enforced at the edge. Fixed-window rate limits protect shared
                  resources; all actions are logged for review.
                </p>
                <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-white/70">
                  <li className="flex items-center gap-2"><Bullet /> Free / Pro / Institution plans</li>
                  <li className="flex items-center gap-2"><Bullet /> Redis-backed limits</li>
                  <li className="flex items-center gap-2"><Bullet /> API keys + SSO (enterprise)</li>
                </ul>
              </>
            }
            actions={<SectionActions primaryHref="/docs#governance" primary="Governance" secondaryHref="/docs#quotas" secondary="Quotas API" />}
          />

          <Section
            kicker="07 • Observability"
            title="Metrics you can trust"
            icon={<Activity className="h-5 w-5" />}
            body={
              <>
                <p>
                  Built-in metrics feed your dashboards: request latency, error budgets, path throughput, model update
                  timings, and hit-prob curves by cohort.
                </p>
                <IntegrationsChips />
              </>
            }
            actions={<SectionActions primaryHref="/docs#metrics" primary="Metrics & scraping" secondaryHref="/docs#slo" secondary="SLOs & budgets" />}
          />

          <Section
            kicker="08 • Security"
            title="Private by default"
            icon={<Lock className="h-5 w-5" />}
            body={
              <>
                <p>
                  AES-256 at rest, TLS in transit, and optional private networking for institutional tenants. No data is
                  sold, rented, or used for unrelated training. Period.
                </p>
                <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-white/70">
                  <li className="flex items-center gap-2"><Bullet /> Key scoping &amp; rotation</li>
                  <li className="flex items-center gap-2"><Bullet /> Principle of least privilege</li>
                  <li className="flex items-center gap-2"><Bullet /> Signed artifacts &amp; replays</li>
                </ul>
              </>
            }
            actions={
              <div className="flex items-center gap-2">
                <AuraWhite>
                  <Button asChild className="rounded-xl bg-white text-black hover:bg-white/90">
                    <a href="/docs">Read the docs</a>
                  </Button>
                </AuraWhite>
                <AuraWhite>
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10"
                  >
                    <a href="/contact">Contact sales</a>
                  </Button>
                </AuraWhite>
              </div>
            }
          />
        </div>
      </div>
    </section>
  );
}

/* ---------- Building blocks ---------- */

function Section(props: {
  kicker: string;
  title: string;
  icon: React.ReactNode;
  body: React.ReactNode;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  accent?: React.ReactNode;
}) {
  const { kicker, title, icon, body, actions, aside, accent } = props;
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.6 }}
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="text-xs tracking-widest uppercase text-white/50">{kicker}</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-2">{icon}</div>
            <h3 className="text-xl md:text-2xl font-medium">{title}</h3>
          </div>
          <div className="mt-3 text-white/75 leading-relaxed">{body}</div>
          {accent ? <div className="mt-4">{accent}</div> : null}
          {actions ? <div className="mt-6">{actions}</div> : null}
        </div>
        {aside ? (
          <div className="lg:w-[40%] rounded-xl border border-white/10 bg-white/5 p-4">{aside}</div>
        ) : null}
      </div>
    </motion.section>
  );
}

function SectionActions({
  primary,
  primaryHref,
  secondary,
  secondaryHref,
}: {
  primary: string;
  primaryHref: string;
  secondary: string;
  secondaryHref: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <AuraWhite>
        <Button asChild className="rounded-xl bg-white text-black hover:bg-white/90">
          <a href={primaryHref}>{primary}</a>
        </Button>
      </AuraWhite>
      <AuraWhite>
        <Button
          asChild
          variant="outline"
          className="rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10"
        >
          <a href={secondaryHref}>{secondary}</a>
        </Button>
      </AuraWhite>
    </div>
  );
}

function KPICard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="mt-4 inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      {icon}
      <div>
        <div className="text-xs text-white/60">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function Bullet() {
  return <span className="h-1.5 w-1.5 rounded-full bg-white/70 inline-block" />;
}

function PipelineRail() {
  const steps = [
    { label: "Ingest", Icon: Network, sub: "Market data & internal feeds" },
    { label: "Feature Store", Icon: Database, sub: "Signals, windows, factors" },
    { label: "Learn", Icon: CircuitBoard, sub: "Online updates" },
    { label: "Simulate", Icon: Cpu, sub: "Path ensembles" },
    { label: "Explain", Icon: BarChart3, sub: "Drivers & scenarios" },
    { label: "Ship", Icon: Rocket, sub: "API & exports" },
  ];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {steps.map(({ label, sub, Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3"
          >
            <div className="rounded-lg border border-white/10 bg-white/5 p-2">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-medium">{label}</div>
              <div className="text-xs text-white/60">{sub}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function IntegrationsChips() {
  const cols = [
    {
      title: "Infra",
      items: [
        { name: "Redis", Icon: Binary },
        { name: "DuckDB", Icon: Database },
        { name: "FastAPI", Icon: Rocket },
      ],
    },
    {
      title: "ML & Quant",
      items: [
        { name: "NumPy", Icon: Sigma },
        { name: "PyTorch", Icon: Cpu },
        { name: "Qiskit", Icon: CircuitBoard },
      ],
    },
    {
      title: "Observability",
      items: [
        { name: "Prometheus", Icon: PrometheusGlyph },
        { name: "Dashboards", Icon: LineChart },
        { name: "SLOs", Icon: Gauge },
      ],
    },
  ];
  return (
    <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
      {cols.map((col) => (
        <div key={col.title}>
          <div className="text-xs uppercase tracking-widest text-white/50 mb-2">{col.title}</div>
          <div className="grid grid-cols-1 gap-2">
            {col.items.map(({ name, Icon }) => (
              <div key={name} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <Icon className="h-4 w-4" />
                <span className="text-sm">{name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PrometheusGlyph(props: React.SVGProps<SVGSVGElement>) {
  // Minimal Prometheus-style flame glyph (license-safe outline)
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3c1.5 4 6 6 6 11a6 6 0 1 1-12 0c0-2.5 1.5-4.5 3-6-.2 2 .8 3.2 2.5 4-.3-2 1-3.4 2.3-4.8C13.4 5.5 12.5 4.4 12 3Z" />
    </svg>
  );
}

/* ---------- Background primitives (match Landing) ---------- */
function Grid() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at top, black 0%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at top, black 0%, transparent 70%)",
        }}
      />
      <motion.div
        className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/10 to-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 1.2 }}
      />
    </div>
  );
}
function Noise() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06] mix-blend-screen"
      style={{
        backgroundImage:
          "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"180\" height=\"180\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" stitchTiles=\"stitch\"/></filter><rect width=\"100%\" height=\"100%\" filter=\"url(%23n)\" opacity=\"0.35\"/></svg>')",
      }}
    />
  );
}

/* ---------- Reusable white hover aura ---------- */
function AuraWhite({ children }: { children: React.ReactNode }) {
  return (
    <div className="[&>*]:transition-shadow">
      <div className="relative group">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-2 -z-10 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(120px 120px at 50% 50%, rgba(255,255,255,0.18), transparent 60%)",
          }}
        />
        {children}
      </div>
    </div>
  );
}

/* ---------- Simple fan chart sketch (no data dependency) ---------- */
function FanChartSketch() {
  return (
    <svg className="w-full h-[220px]" viewBox="0 0 800 260" role="img" aria-label="Fan chart">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
        </linearGradient>
        <linearGradient id="g2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
        </linearGradient>
      </defs>
      <line x1="40" y1="210" x2="760" y2="210" stroke="rgba(255,255,255,0.1)" />
      <motion.path
        d="M40,210 C160,170 280,150 400,150 520,150 640,170 760,210 L760,230 C640,190 520,170 400,170 280,170 160,190 40,230 Z"
        fill="url(#g1)"
        initial={{ opacity: 0, translateY: 8 }}
        whileInView={{ opacity: 1, translateY: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      />
      <motion.path
        d="M40,210 C200,140 300,120 400,120 500,120 600,140 760,210 L760,210 C600,170 500,150 400,150 300,150 200,170 40,210 Z"
        fill="url(#g2)"
        initial={{ opacity: 0, translateY: 8 }}
        whileInView={{ opacity: 1, translateY: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.1 }}
      />
      <motion.path
        d="M40,210 C200,160 300,145 400,145 500,145 600,160 760,210"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth={2}
        fill="none"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: "easeOut" }}
      />
      <circle cx="40" cy="210" r="3" fill="#fff" />
    </svg>
  );
}

