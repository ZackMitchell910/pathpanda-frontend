// src/landing/Landing.tsx
import React, { useState, useLayoutEffect } from "react";
import { motion } from "framer-motion";
import NavBar from "@/components/marketing/NavBar";
import BackgroundOrbs from "@/components/marketing/BackgroundOrbs";
import HeroNarrativeFlowCascade from "@/components/marketing/HeroNarrativeFlowCascade";
import FeatureTiles from "@/components/marketing/FeatureTiles";
import IntegrationsRow from "@/components/marketing/IntegrationsRow";
import Footer from "@/components/marketing/Footer";

// ---- Browser-safe API base (Vite + Vercel/Render) ----
const RAW_API_BASE =
  (typeof window !== "undefined" && (window as any).__PP_API_BASE__) ||
  (import.meta as any)?.env?.VITE_PREDICTIVE_API ||
  (typeof process !== "undefined" && (process as any)?.env?.NEXT_PUBLIC_BACKEND_URL) ||
  "https://api.simetrix.io";
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");
const api = (p: string) => `${API_BASE}${p}`;
const SHOW_HEALTH = import.meta.env.DEV || import.meta.env.VITE_SHOW_HEALTH === "1";

// ---- Dev-only health check (hidden in prod) ----
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
          className="px-4 py-2 rounded-xl bg-[#CBA135] text-white font-semibold hover:brightness-110 transition"
        >
          Recheck /health
        </button>
        <span
          className={
            status === "ok"
              ? "text-[#CBA135]"
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
  // Keep body/html classes tidy for landing (single scroll)
  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.classList.add("landing-html");
    body.classList.add("landing-body");
    return () => {
      html.classList.remove("landing-html");
      body.classList.remove("landing-body");
    };
  }, []);

  return (
    <main className="landing-shell relative overflow-x-hidden">
      {/* Kill ALL link underlines within landing page */}
      <style>{`
        .landing-shell a,
        .landing-shell a:hover,
        .landing-shell a:focus,
        .landing-shell a:focus-visible,
        .landing-shell a:active,
        .landing-shell a:visited { text-decoration: none !important; }
      `}</style>

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
          AI-Driven Simulations for Unrivaled Market Insight
        </motion.h1>

        <p className="mt-4 max-w-2xl mx-auto text-white/75">
          Simetrix runs thousands of simulation paths to forecast prices, explain drivers, and learn in real time.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {/* Run a Simulation — keep original colors, no underline */}
          <a
            href="/app"
            className={[
              "inline-flex items-center justify-center",
              "rounded-xl px-5 py-3 text-sm sm:text-base font-semibold",
              "bg-[#CBA135] text-white",
              "ring-1 ring-[rgba(227,192,90,0.40)]",
              "transition hover:brightness-110 hover:shadow-[0_0_28px_0_rgba(203,161,53,0.28)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3C05A]",
              "no-underline hover:no-underline focus-visible:no-underline"
            ].join(" ")}
            aria-label="Run a simulation"
          >
            Run a Simulation
          </a>

          {/* View Demo — underline removed */}
          <a
            href="#product"
            className="rounded-xl px-5 py-3 border border-white/20 hover:border-white/40 transition no-underline hover:no-underline focus-visible:no-underline"
            aria-label="View the product demo"
          >
            View Demo
          </a>
        </div>

        <div className="mt-10" role="img" aria-label="Interactive simulation visualization">
          <HeroNarrativeFlowCascade height={380} />
        </div>

        <FeatureTiles />
      </section>
      {/* Product */}
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

            {/* See Pricing — keep colors, remove underline */}
            <a
              href="#pricing"
              className={[
                "inline-block px-5 py-3 rounded-xl font-semibold",
                "bg-[#CBA135] text-white",
                "ring-1 ring-[rgba(227,192,90,0.40)]",
                "transition hover:brightness-110 hover:shadow-[0_0_28px_0_rgba(203,161,53,0.28)]",
                "no-underline hover:no-underline focus-visible:no-underline"
              ].join(" ")}
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
            <div className="h-64 bg-gradient-to-br from-[rgba(203,161,53,0.10)] to-[rgba(255,255,255,0.06)] rounded-xl flex items-center justify-center text-white/40">
              Dashboard Preview
            </div>
          </motion.div>
        </div>
      </section>

      {/* Docs */}
      <section id="docs" className="mx-auto max-w-6xl px-4 py-20 border-t border-white/10">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h2 className="font-brand text-3xl">Docs</h2>
            <p className="text-white/80">SDKs in TS/JS, Python. Start with /sim endpoint for quick forecasts.</p>
            <ul className="text-sm space-y-2 text-white/70">
              <li>• TS SDK: npm i @simetrix/sdk</li>
              <li>• Python: pip install simetrix-py</li>
              <li>• Quickstart: /sim?symbol=AAPL&amp;horizon=30</li>
              <li>• Artifacts: JSON with paths, bands, drivers</li>
              <li>• Webhooks for real-time updates</li>
            </ul>
            <div className="mt-6">
              <a
                href="https://docs.simetrix.io"
                className="rounded-lg px-4 py-2 bg:white/5 border border-white/10 hover:border-white/30 transition no-underline hover:no-underline focus-visible:no-underline"
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

      {/* Pricing */}
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
            <a
              href="/app"
              className="mt-auto rounded-lg px-4 py-2 border border-white/15 hover:border-white/30 text-center transition no-underline hover:no-underline focus-visible:no-underline"
            >
              Get Started
            </a>
          </motion.div>
          {/* Pro */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[rgba(203,161,53,0.30)] ring-1 ring-[rgba(227,192,90,0.40)] bg-[rgba(203,161,53,0.05)] p-6 flex flex-col"
          >
            <div className="text-sm font-semibold text-[#CBA135]">Pro</div>
            <div className="text-3xl font-bold mt-2">
              $39<span className="text-base text-white/60">/mo</span>
            </div>
            <ul className="text-sm text-white/70 mt-4 space-y-2 flex-1">
              <li>All symbols + custom watchlists</li>
              <li>Full fan-chart + terminal analysis</li>
              <li>Track Record &amp; cohort explorer</li>
              <li>Email summaries (weekly)</li>
            </ul>
            <a
              href="/app"
              className={[
                "mt-auto rounded-lg px-4 py-2 text-center font-semibold",
                "bg-[#CBA135] text-white",
                "ring-1 ring-[rgba(227,192,90,0.40)]",
                "transition hover:brightness-110 hover:shadow-[0_0_22px_0_rgba(203,161,53,0.25)]",
                "no-underline hover:no-underline focus-visible:no-underline"
              ].join(" ")}
            >
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
            <a
              href="#contact"
              className="mt-auto rounded-lg px-4 py-2 border border-white/15 hover:border-white/30 text-center transition no-underline hover:no-underline focus-visible:no-underline"
            >
              Contact Sales
            </a>
          </motion.div>
        </div>
        <p className="mt-8 text-xs text-white/50 text-center">
          * Pricing subject to change during beta. Some features may be limited or roll out gradually.
        </p>
      </section>
      {/* Integrations */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <IntegrationsRow />
      </section>
      {/* Open Dashboard */}
      <section className="mx-auto max-w-6xl px-4 py-20 border-t border-white/10">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="font-brand text-3xl mb-2">Open the Dashboard</h2>
            <p className="opacity-80 mb-4">Forecasts, fan charts, scenarios, and execution — live in <code>/app</code>.</p>

            <a
              href="/app"
              className={[
                "inline-block px-5 py-3 rounded-xl font-semibold",
                "bg-[#CBA135] text-white",
                "ring-1 ring-[rgba(227,192,90,0.40)]",
                "transition hover:brightness-110 hover:shadow-[0_0_24px_0_rgba(203,161,53,0.24)]",
                "no-underline hover:no-underline focus-visible:no-underline"
              ].join(" ")}
              aria-label="Access the dashboard"
            >
              Open the Dashboard
            </a>
          </div>
          <div className="rounded-2xl border border-white/10 p-4 bg-white/5">
            <div className="h-48 bg-gradient-to-br from-[rgba(203,161,53,0.10)] to-[rgba(255,255,255,0.06)] rounded-xl flex items-center justify-center text-white/40">
              Live Dashboard View
            </div>
          </div>
        </div>
      </section>

      {SHOW_HEALTH && <HealthCheck />}

      <Footer />
    </main>
  );
}
