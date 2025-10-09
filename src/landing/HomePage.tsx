import React from "react";
import NavBar from "@/components/marketing/NavBar";
import BackgroundOrbs from "@/components/marketing/BackgroundOrbs";
import HeroFanChartLanding from "@/components/marketing/HeroFanChartLanding";
import { motion } from "framer-motion";

export default function HomePage() {
  const gradientBg =
    "bg-[radial-gradient(1200px_600px_at_70%_-10%,rgba(52,211,153,0.18),transparent_60%),radial-gradient(800px_400px_at_10%_20%,rgba(125,211,252,0.14),transparent_60%)]";

  return (
    <main className={`relative min-h-screen bg-[#0A111A] text-[#F9F8F3] ${gradientBg}`}>
      <BackgroundOrbs />
      <NavBar />
      {/* … paste the hero + features + integrations + footer sections we built … */}
      <section className="max-w-6xl mx-auto px-4 pt-8 pb-4">
        <motion.h1
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-6xl font-semibold leading-tight"
        >
          Predict markets before they move.
        </motion.h1>
        <p className="mt-4 max-w-2xl text-white/75">
          Simetrix runs thousands of Monte Carlo paths to forecast prices, explain drivers, and learn in real time.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <a href="/app" className="rounded-lg px-5 py-3 bg-emerald-400 text-[#0A111A] font-semibold hover:brightness-110 transition">
            Run a Simulation
          </a>
          <a href="#product" className="rounded-lg px-5 py-3 border border-white/20 hover:border-white/40 transition">
            Watch Demo
          </a>
        </div>
        <div className="mt-10">
          <HeroFanChartLanding />
        </div>
      </section>
      {/* …rest of sections… */}
    </main>
  );
}
