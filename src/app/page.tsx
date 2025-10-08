"use client";

import { motion } from "framer-motion";
import HeroFanChart from "@/components/marketing/HeroFanChartLanding;"
import LogoTwinCore from "@/components/branding/LogoTwinCore";


const gradientBg =
  "bg-[radial-gradient(1200px_600px_at_70%_-10%,rgba(52,211,153,0.18),transparent_60%),radial-gradient(800px_400px_at_10%_20%,rgba(125,211,252,0.14),transparent_60%)]";

export default function Home() {
  return (
    <main className={`min-h-screen bg-[#0A111A] text-[#F9F8F3] ${gradientBg}`}>
    <header className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <LogoTwinCore size={28} />
        <span className="tracking-wide font-semibold">SIMETRIX</span>
      </div>
      {/* Nav */}
      <header className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Twin Core glyph */}
          <div className="h-7 w-7 rounded-full relative">
            <div className="absolute inset-0 rounded-full border border-emerald-400/60" />
            <div className="absolute inset-0 rounded-full blur-[6px] bg-emerald-400/20" />
          </div>
          <span className="tracking-wide font-semibold">SIMETRIX</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-white/70">
          <a href="#product" className="hover:text-white">Product</a>
          <a href="#docs" className="hover:text-white">Docs</a>
          <a href="#pricing" className="hover:text-white">Pricing</a>
          <a href="#contact" className="hover:text-white">Contact</a>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-8 pb-4">
        <motion.h1
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-6xl font-semibold leading-tight"
        >
          Predict markets before they move.
        </motion.h1>
        <motion.p
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="mt-4 max-w-2xl text-white/75"
        >
          Simetrix runs millions of Monte Carlo paths to forecast prices, explain drivers,
          and learn in real time.
        </motion.p>

        <motion.div
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.14 }}
          className="mt-6 flex items-center gap-3"
        >
          <a
            href="/app"
            className="rounded-lg px-5 py-3 bg-emerald-400 text-[#0A111A] font-semibold hover:brightness-110 transition"
          >
            Run a Simulation
          </a>
          <a
            href="#demo"
            className="rounded-lg px-5 py-3 border border-white/20 hover:border-white/40 transition"
          >
            Watch Demo
          </a>
        </motion.div>

        <div className="mt-10">
          <HeroFanChart />
        </div>
      </section>

      {/* Features */}
      <section id="product" className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-4 gap-4">
          {[
            {
              title: "Autonomous Forecasting Engine",
              body: "Monte-Carlo engine with adaptive volatility and scenario tilts.",
            },
            {
              title: "Self-Learning AI",
              body: "Outcomes are labeled automatically and models update online.",
            },
            {
              title: "Explainability & Drivers",
              body: "Top drivers, target ladder, and scenario tiles reveal the why.",
            },
            {
              title: "Built for Pros",
              body: "Analysts • Traders • Institutions. FastAPI • DuckDB • Redis.",
            },
          ].map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ y: 18, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
              className="rounded-xl border border-[#1B2431] bg-[#0E1420]/70 backdrop-blur-md p-5 hover:shadow-[0_0_24px_rgba(52,211,153,0.18)] transition"
            >
              <h3 className="font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm text-white/70">{c.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="text-center text-white/70 text-sm tracking-widest">
          INTEGRATIONS & STACK
        </div>
        <div className="mt-5 grid grid-cols-3 md:grid-cols-6 gap-4 opacity-80">
          {["polygon", "redis", "DuckDB", "TensorFlow", "FastAPI", "React"].map((n) => (
            <div
              key={n}
              className="h-12 rounded-lg border border-[#1B2431] bg-[#0E1420]/50 flex items-center justify-center text-white/70"
            >
              {n}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-10 text-center text-white/70">
          Interested in partnership or acquisition?{" "}
          <a className="underline decoration-emerald-400/70 hover:text-white" href="mailto:founders@simetrix.ai">
            founders@simetrix.ai
          </a>
          <div className="mt-2 text-xs">Salt Lake City • Built in USA</div>
        </div>
      </footer>
    </main>
  );
}
