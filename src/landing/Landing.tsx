import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, LineChart, Sparkles, Cpu, Lock, BrainCircuit, BarChart3, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/marketing/NavBar";
import Footer from "@/components/marketing/Footer";
import IntegrationsRow from "@/components/marketing/IntegrationsRow";

export default function Landing() {
  return (
    <main className="relative isolate overflow-hidden bg-black text-white">
      {/* Optional: kill all underlines on landing */}
      <style>{`
        .landing a,
        .landing a:hover,
        .landing a:focus,
        .landing a:active { text-decoration: none !important; }
      `}</style>

      <NavBar />

      <section className="landing relative isolate overflow-hidden">
        {/* Background layers */}
        <Noise />
        <Grid />
        <Glow />

        <div className="mx-auto max-w-7xl px-6 pt-28 pb-24 md:px-8 md:pt-36 md:pb-28">
          {/* Lead badge */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Enterprise‑grade predictive engine
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="font-brand text-4xl leading-tight md:text-6xl md:leading-[1.1]"
          >
            Financial foresight,
            <span className="mx-3 inline-block bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
              at machine scale
            </span>
          </motion.h1>

          {/* Subhead */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-4 max-w-3xl text-white/70"
          >
            Simetrix runs Monte‑Carlo path ensembles, online learning, and quantum samplers to deliver daily
            probability distributions, risk bands, and explainable drivers across assets.
          </motion.p>

          {/* CTA row */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Aura>
              <Button asChild className="rounded-xl bg-white px-5 py-5 text-black hover:bg-white/90">
                <a href="/app">
                  Run a Simulation
                  <ArrowRight className="ml-2 inline h-4 w-4" />
                </a>
              </Button>
            </Aura>
            <Aura>
              <Button asChild variant="outline" className="rounded-xl border-white/20 bg-transparent px-5 py-5 text-white hover:bg-white/10">
                <a href="#pricing">See Pricing</a>
              </Button>
            </Aura>
            <span className="ml-2 text-xs text-white/50"></span>
          </motion.div>

          {/* Hero content split */}
          <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-2">
            {/* Left: credibility + KPIs + mini code */}
            <div className="space-y-8">
              <CredibilityStrip />
              <KpiRow />
              <SnippetCard />
            </div>

            {/* Right: fan chart sketch */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative h-[320px] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-center justify-between pb-2 text-xs text-white/60">
                <div className="inline-flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400/80" />
                  Monte‑Carlo Fan Chart
                </div>
                <div className="inline-flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><Cpu className="h-3.5 w-3.5"/> HPC</span>
                  <span className="inline-flex items-center gap-1"><Lock className="h-3.5 w-3.5"/> AES‑256</span>
                </div>
              </div>
              <FanChartSketch />
            </motion.div>
          </div>
        </div>
      </section>

      <ProductsSection />

      {/* Features */}
      <FeaturesSection />

      {/* Integrations — uses your existing component with hover amber aura */}
      <section className="mx-auto max-w-7xl px-6 md:px-8 py-16">
        <div className="text-center mb-8">
          <h2 className="font-brand text-2xl md:text-3xl">Built on proven infrastructure</h2>
          <p className="text-white/60 mt-2">Data, compute, and tooling that scale with you.</p>
        </div>
        <IntegrationsRow />
      </section>

      {/* Pricing */}
      <PricingSection />

      <Footer />
    </main>
  );
}

/* ---------- Background primitives ---------- */
function Grid() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {/* subtle grid */}
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
      {/* scanline */}
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
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06] mix-blend-screen"
      style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"180\" height=\"180\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" stitchTiles=\"stitch\"/></filter><rect width=\"100%\" height=\"100%\" filter=\"url(%23n)\" opacity=\"0.35\"/></svg>')" }}
    />
  );
}

function Glow() {
  return (
    <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 -z-10 h-[420px] w-[420px] rounded-full blur-3xl"
      style={{ background: "radial-gradient(closest-side, rgba(251,191,36,0.10), transparent 70%)" }}
    />
  );
}

/* ---------- Widgets ---------- */
function Aura({ children }: { children: React.ReactNode }) {
  return (
    <div className="[&>*]:transition-shadow">
      <div className="relative">
        {/* soft white glow instead of amber */}
        <div className="absolute -inset-2 -z-10 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" 
             style={{ background: "radial-gradient(120px 120px at 50% 50%, rgba(255,255,255,0.22), transparent 60%)" }} />
        <div className="group relative">{children}</div>
      </div>
    </div>
  );
}

function CredibilityStrip() {
  const items = [
    { icon: <LineChart className="h-4 w-4" />, text: "Risk bands & forecast intervals" },
    { icon: <Sparkles className="h-4 w-4" />, text: "Online learning loop" },
    { icon: <ShieldCheck className="h-4 w-4" />, text: "Auditable runs & quotas" },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          <div className="mb-2 flex items-center gap-2 text-white">
            {it.icon}
            <span className="font-medium">{it.text.split(" ")[0]}</span>
          </div>
          <div className="text-white/60">{it.text}</div>
        </div>
      ))}
    </div>
  );
}

function KpiRow() {
  const KPIs = [
    { label: "Paths / run", value: 1000000 },
    { label: "Symbols / day", value: 1200 },
    { label: "p95 latency", value: 380, suffix: "ms" },
  ];
  return (
    <div className="grid grid-cols-3 gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      {KPIs.map((k) => (
        <Kpi key={k.label} {...k} />
      ))}
    </div>
  );
}

function Kpi({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="text-center">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-2xl font-semibold"
      >
        <RollingNumber n={value} />{suffix ? <span className="ml-1 text-white/60">{suffix}</span> : null}
      </motion.div>
      <div className="mt-1 text-xs uppercase tracking-wide text-white/50">{label}</div>
    </div>
  );
}

function RollingNumber({ n }: { n: number }) {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const d = Math.max(600, Math.min(1400, n * 12));
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / d);
      setV(Math.round(n * easeOutCubic(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n]);
  return <>{v.toLocaleString()}</>;
}

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

function SnippetCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-4">
      <div className="mb-2 text-xs text-white/60">API in one call</div>
      <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/60 p-4 text-[12px] leading-relaxed text-emerald-300/90">
{`GET /quant/daily/today
X-API-Key: ••••••••••••

→ { symbol: "NVDA", prob_up_30d: 0.62, p95: 165.4 }`}
      </pre>
    </div>
  );
}

function FanChartSketch() {
  // Simple SVG fan with symmetrical percentiles (not downward‑angled)
  return (
    <svg className="h-full w-full" viewBox="0 0 800 360" role="img" aria-label="Fan chart visualization">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
        </linearGradient>
        <linearGradient id="g2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(251,191,36,0.25)" />
          <stop offset="100%" stopColor="rgba(251,191,36,0.05)" />
        </linearGradient>
      </defs>

      {/* Baseline axis */}
      <line x1="64" y1="300" x2="760" y2="300" stroke="rgba(255,255,255,0.1)" />

      {/* Percentile bands */}
      <Band d="M64,300 C180,260 300,240 420,240 540,240 660,260 760,300 L760,320 C660,280 540,260 420,260 300,260 180,280 64,320 Z" fill="url(#g1)" />
      <Band d="M64,300 C200,230 300,210 420,210 540,210 640,230 760,300 L760,300 C640,260 540,240 420,240 300,240 200,260 64,300 Z" fill="url(#g2)" />

      {/* Median path */}
      <motion.path
        d="M64,300 C200,250 300,235 420,235 540,235 640,250 760,300"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={2}
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.8, ease: "easeOut" }}
      />

      {/* Start dot */}
      <circle cx="64" cy="300" r="4" fill="white" />
    </svg>
  );
}

function Band({ d, fill }: { d: string; fill: string }) {
  return (
    <motion.path
      d={d}
      fill={fill}
      initial={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ duration: 0.8 }}
    />
  );
}

/* ---------- New Sections ---------- */
function ProductsSection() {
  const products = [
    {
      name: "Simetrix Dash",
      description: "Forecasting console for Monte Carlo simulations, drivers, and daily quant signals.",
      href: "/app",
      status: "Live",
      icon: LineChart,
    },
    {
      name: "MarketSimulator",
      description: "Run narrative shocks across the synthetic market twin.",
      href: "/market-simulator",
      status: "Coming soon",
      icon: Sparkles,
    },
  ];

  return (
    <section id="products" className="mx-auto max-w-7xl px-6 md:px-8 py-16 border-t border-white/10">
      <div className="mb-8 text-center">
        <h2 className="font-brand text-2xl md:text-3xl">Products</h2>
        <p className="mt-2 text-white/60">Choose the workspace that fits your simulation workflow.</p>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {products.map((product, index) => {
          const Icon = product.icon;
          const isComingSoon = product.status.toLowerCase().includes("coming");
          return (
            <motion.a
              key={product.name}
              href={product.href}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.05 }}
              className="group relative flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-white/20 hover:bg-white/10"
            >
              <div className="flex items-center justify-between text-xs text-white/60">
                <span className="inline-flex items-center gap-2 text-white/80">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold text-white">{product.name}</span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    isComingSoon ? "border border-amber-400/40 bg-amber-400/10 text-amber-200" : "border border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                  }`}
                >
                  {product.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-white/70">{product.description}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm text-white/80">
                {isComingSoon ? "Preview" : "Open"}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </motion.a>
          );
        })}
      </div>
    </section>
  );
}

function FeaturesSection() {
  const items = [
    { title: "Autonomous Forecasting Engine", desc: "Unattended runs with cohort logging and settlement.", Icon: LineChart },
    { title: "Self‑Learning AI", desc: "Online updates as new data arrives; improves over time (no ML jargon required).", Icon: BrainCircuit },
    { title: "Explainability & Drivers", desc: "Attribution to factors, regimes, and scenarios.", Icon: BarChart3 },
    { title: "Analysts • Traders • Institutions", desc: "Role‑ready workflows with quotas and audit trails.", Icon: Users },
  ];
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 md:px-8 py-16 border-t border-white/10">
      <div className="text-center mb-10">
        <h2 className="font-brand text-2xl md:text-3xl">Signal. Risk. Explainability.</h2>
        <p className="text-white/60 mt-2">Everything you need to move from guesswork to probability-based strategies.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {items.map(({ title, desc, Icon }, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            className="flex flex-col items-center text-center rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <Icon className="h-5 w-5" />
            </div>
            <div className="text-base font-medium">{title}</div>
            <div className="mt-1 text-sm text-white/60">{desc}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function PricingSection() {
  const tiers = [
    {
      name: "Starter",
      price: "$9.99",
      tagline: "Solo Builders & Analysts",
      features: ["100 sims/day", "Fan charts & intervals", "Email support", "Simetrix AI"],
      cta: { label: "Start", href: "/app" },
      highlight: false,
    },
    {
      name: "Pro",
      price: "$49",
      tagline: "Teams Shipping Decisions",
      features: ["1,000 sims/day", "API access", "Redis cache + quotas", "Quant Signals"],
      cta: { label: "Start Pro", href: "/app" },
      highlight: true,
    },
    {
      name: "Institution",
      price: "Talk to us",
      tagline: "SLAs, Custom Models, Predictive Scenarios",
      features: ["Unlimited sims", "SAML SSO", "Private networking", "Dedicated support"],
      cta: { label: "Contact Sales", href: "/contact" },
      highlight: false,
    },
  ];

  return (
    <section id="pricing" className="mx-auto max-w-7xl px-6 md:px-8 py-20 border-t border-white/10">
      <div className="text-center mb-12">
        <h2 className="font-brand text-3xl md:text-4xl">Pricing</h2>
        <p className="mt-2 text-white/70">Early access pricing — we can tune together.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((t) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={`rounded-2xl border ${t.highlight ? "border-white-400/40 bg-black-400/[0.06]" : "border-white/10 bg-white/5"} p-6 flex flex-col`}
          >
            <div className="text-sm font-semibold">{t.name}</div>
            <div className="text-3xl font-bold mt-2">{t.price}</div>
            <div className="text-white/60 text-sm mt-1">{t.tagline}</div>
            <ul className="text-sm text-white/70 mt-4 space-y-2">
              {t.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/60" /> {f}
                </li>
              ))}
            </ul>
            <Aura>
              <Button asChild className={`mt-6 rounded-xl ${t.highlight ? "bg-white text-black hover:bg-white/90" : "bg-white/10 text-white hover:bg-white/15"}`}>
                <a href={t.cta.href}>{t.cta.label}</a>
              </Button>
            </Aura>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
