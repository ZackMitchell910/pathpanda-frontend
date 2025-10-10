// src/landing/Landing.tsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import NavBar from "@/components/marketing/NavBar";
import BackgroundOrbs from "@/components/marketing/BackgroundOrbs";
import HeroNarrativeFlowCascade from "@/components/marketing/HeroNarrativeFlowCascade"; // Primary hero visualization
import FeatureTiles from "@/components/marketing/FeatureTiles";
import IntegrationsRow from "@/components/marketing/IntegrationsRow";
import Footer from "@/components/marketing/Footer";


// ---- Browser-safe API base (Vite + Netlify) ----
const RAW_API_BASE =
  (typeof window !== "undefined" && (window as any).__PP_API_BASE__) ||
  (import.meta as any)?.env?.VITE_PREDICTIVE_API ||
  (typeof process !== "undefined" && (process as any)?.env?.NEXT_PUBLIC_BACKEND_URL) ||
  "https://api.simetrix.io";

const API_BASE = RAW_API_BASE.replace(/\/+$/, "");
const api = (p: string) => `${API_BASE}${p}`;
const SHOW_HEALTH = import.meta.env.DEV || import.meta.env.VITE_SHOW_HEALTH === "1";

// ---- Dev/opt-in health check (hidden in prod) ----
function HealthCheck() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "fail">("idle");
  const [detail, setDetail] = useState("");

  async function run() {
    setStatus("loading");
    setDetail("");
    try {
      const r = await fetch(api("/health"), { headers: { Accept: "application/json" } });
      const txt = await r.text().catch(() => "");
      setDetail(txt || (r.ok ? "OK" : `HTTP ${r.status}`));
      setStatus(r.ok ? "ok" : "fail");
    } catch (e: any) {
      setDetail(e?.message || String(e));
      setStatus("fail");
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center gap-3">
        <button
          onClick={run}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition"
        >
          Recheck /health
        </button>
        <span
          className={
            status === "ok"
              ? "text-emerald-400"
              : status === "fail"
              ? "text-rose-400"
              : status === "loading"
              ? "text-yellow-400"
              : "text-gray-400"
          }
        >
          {status === "idle" && "Idle"}
          {status === "loading" && "Checking…"}
          {status === "ok" && "Backend OK"}
          {status === "fail" && "Backend unreachable"}
        </span>
      </div>
      {detail && (
        <pre className="mt-3 whitespace-pre-wrap text-xs opacity-75 border border-white/10 rounded-xl p-3 bg-white/5">
          {detail}
        </pre>
      )}
    </section>
  );
}

export default function Landing() {
  const gradientBg =
    "bg-[radial-gradient(1200px_600px_at_70%_-10%,rgba(52,211,153,0.18),transparent_60%),radial-gradient(800px_400px_at_10%_20%,rgba(125,211,252,0.14),transparent_60%)]";

  return (
    <main className={`relative min-h-screen bg-[#0A111A] text-[#F9F8F3] ${gradientBg}`}>
      <BackgroundOrbs />
      <NavBar />

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-4 text-center" aria-labelledby="hero-heading">
        <motion.h1
          id="hero-heading"
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="font-semibold text-4xl md:text-6xl leading-tight tracking-tight"
        >
          Simulate Markets Before They Move
        </motion.h1>

        <p className="mt-4 max-w-2xl mx-auto text-white/75">
          Simetrix runs thousands of simulation paths to forecast prices, explain drivers, and learn in real time.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/app"
            className="rounded-lg px-5 py-3 bg-emerald-400 text-[#0A111A] font-semibold hover:brightness-110 transition"
            aria-label="Run a simulation"
          >
            Run a Simulation
          </a>
          <a
            href="#product"
            className="rounded-lg px-5 py-3 border border-white/20 hover:border-white/40 transition"
            aria-label="View the product demo"
          >
            View Demo
          </a>
        </div>

        {/* Primary hero visualization */}
        <div className="mt-10" role="img" aria-label="Interactive simulation visualization">
          <HeroNarrativeFlowCascade height={380} />
        </div>

        <FeatureTiles />
      </section>

      {/* ============= Features / Integrations ============= */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <IntegrationsRow />
      </section>

      {/* ============= Product ============= */}
      <section id="product" className="mx-auto max-w-6xl px-4 py-20 border-t border-white/10">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h2 className="font-brand text-3xl md:text-4xl">Simetrix Simulator</h2>
            <p className="text-white/80">
              Fan charts, accuracy tracking, cohorts. Forecasts trained on Twitter, a dive into simulations that visualizes paths.
            </p>
            <ul className="text-sm space-y-2 text-white/70">
              <li>• Fan charts with P80/P95 bands</li>
              <li>• Track Record &amp; cohort explorer</li>
              <li>• Explainable drivers (SHAP weights)</li>
              <li>• Terminal distributions &amp; hit ladders</li>
            </ul>
            <a
              href="#pricing"
              className="inline-block px-5 py-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 hover:brightness-110 transition"
            >
              See Pricing
            </a>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl border border-white/10 p-6 bg-white/5"
          >
            {/* Placeholder for product screenshot or mini-demo */}
            <div className="h-64 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-xl flex items-center justify-center text-white/40">
              Dashboard Preview
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============= Docs ============= */}
      <section id="docs" className="mx-auto max-w-6xl px-4 py-20 border-t border-white/10">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h2 className="font-brand text-3xl">Docs</h2>
            <p className="text-white/80">
              SDKs in TS/JS, Python. Start with /sim endpoint for quick forecasts.
            </p>
            <ul className="text-sm space-y-2 text-white/70">
              <li>• TS SDK: npm i @simetrix/sdk</li>
              <li>• Python: pip install simetrix-py</li>
              <li>• Quickstart: /sim?symbol=AAPL&amp;horizon=30</li>
              <li>• Artifacts: JSON with paths, bands, drivers</li>
              <li>• Webhooks for real-time updates</li>
            </ul>
            <div className="mt-6">
              <a
                href="https://docs.simetrix.ai" // Update with actual docs URL
                className="rounded-lg px-4 py-2 bg-white/5 border border-white/10 hover:border-white/30 transition"
              >
                Open API &amp; Usage Examples
              </a>
            </div>
          </div>
          <div className="space-y-6">
            <h3 className="font-semibold text-xl">API Reference</h3>
            <p className="text-white/80">
              Full endpoints for predictions, metrics, and cohorts. Includes DuckDB feature store; automatic labeling &amp; online learning.
            </p>
            <ul className="text-sm space-y-2 text-white/70">
              <li>• /sim: Run forecast</li>
              <li>• /track: Accuracy &amp; backtests</li>
              <li>• /drivers: SHAP explainability</li>
              <li>• /webhooks: Real-time alerts</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ============= Pricing ============= */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 border-t border-white/10">
        <div className="text-center mb-12">
          <h2 className="font-brand text-3xl md:text-4xl">Pricing</h2>
          <p className="mt-2 text-white/70">Early-access pricing — we can tune together.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col"
          >
            <div className="text-sm font-semibold">Starter</div>
            <div className="text-3xl font-bold mt-2">$0</div>
            <ul className="text-sm text-white/70 mt-4 space-y-2 flex-1">
              <li>Public symbols (limited)</li>
              <li>Fan-chart preview</li>
              <li>Basic docs</li>
            </ul>
            <a href="/app" className="mt-auto rounded-lg px-4 py-2 border border-white/15 hover:border-white/30 text-center transition">
              Get Started
            </a>
          </motion.div>

          {/* Pro */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-400/30 ring-1 ring-emerald-400/30 bg-emerald-500/5 p-6 flex flex-col"
          >
            <div className="text-sm font-semibold text-emerald-200">Pro</div>
            <div className="text-3xl font-bold mt-2">$39<span className="text-base text-white/60">/mo</span></div>
            <ul className="text-sm text-white/70 mt-4 space-y-2 flex-1">
              <li>All symbols + custom watchlists</li>
              <li>Full fan-chart + terminal analysis</li>
              <li>Track Record &amp; cohort explorer</li>
              <li>Email summaries (weekly)</li>
            </ul>
            <a href="/app" className="mt-auto rounded-lg px-4 py-2 bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30 text-center hover:brightness-110 transition">
              Start Pro
            </a>
          </motion.div>

          {/* Enterprise */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col"
          >
            <div className="text-sm font-semibold">Enterprise</div>
            <div className="text-3xl font-bold mt-2">Custom</div>
            <ul className="text-sm text-white/70 mt-4 space-y-2 flex-1">
              <li>SLA, SSO, seats &amp; governance</li>
              <li>Private data connectors</li>
              <li>Export &amp; API quotas</li>
              <li>Priority roadmap</li>
            </ul>
            <a href="#contact" className="mt-auto rounded-lg px-4 py-2 border border-white/15 hover:border-white/30 text-center transition">
              Contact Sales
            </a>
          </motion.div>
        </div>
        <p className="mt-8 text-xs text-white/50 text-center">
          * Pricing subject to change during beta. Some features may be limited or roll out gradually.
        </p>
      </section>

      {/* ============= Open Dashboard ============= */}
      <section className="mx-auto max-w-6xl px-4 py-20 border-t border-white/10">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="font-brand text-3xl mb-2">Open the Dashboard</h2>
            <p className="opacity-80 mb-4">
              Forecasts, fan charts, scenarios, and execution — live in <code>/app</code>.
            </p>
            <a
              href="/app"
              className="inline-block px-5 py-3 rounded-xl bg-white text-black font-medium hover:opacity-90 transition"
              aria-label="Access the dashboard"
            >
              Open the Dashboard
            </a>
          </div>
          <div className="rounded-2xl border border-white/10 p-4 bg-white/5">
            {/* Optional: small screenshot or animated preview */}
            <div className="h-48 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-xl flex items-center justify-center text-white/40">
              Live Dashboard View
            </div>
          </div>
        </div>
      </section>

      {/* Health Check (Dev Only) */}
      {SHOW_HEALTH && <HealthCheck />}

      <Footer />
    </main>
  );
}