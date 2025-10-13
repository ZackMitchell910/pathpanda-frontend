import React from "react";
import { LineChart, BrainCircuit, BarChart3, Sparkles } from "lucide-react";

const features = [
  {
    title: "Autonomous Forecasting Engine",
    desc: "Unattended runs with cohort logging and settlement.",
    Icon: LineChart,
  },
  {
    title: "Auto-Labeling & Online Learning",
    desc: "Labels outcomes and updates models as new data arrives.",
    Icon: BrainCircuit,
  },
  {
    title: "Explainability & Drivers",
    desc: "Attribution by factors, regimes, and scenarios.",
    Icon: BarChart3,
  },
  {
    title: "Daily Quant Signal",
    desc: "Shortlist → rank → Monte Carlo → concise pick with blurb.",
    Icon: Sparkles,
  },
];

export default function FeatureTiles() {
  return (
    <section className="max-w-6xl mx-auto px-4 pt-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        {features.map(({ title, desc, Icon }) => (
          <div
            key={title}
            className="
              group relative rounded-2xl border border-white/10 bg-white/5
              hover:bg-white/[0.07] hover:ring-1 hover:ring-amber-400/40
              hover:shadow-[0_0_28px_rgba(251,191,36,0.12)]
              transition-all p-5 h-full
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60
            "
          >
            {/* Centered vertical stack */}
            <div className="flex flex-col items-center justify-center text-center gap-3 min-h-[170px] h-full">
              <span
                className="
                  inline-flex h-12 w-12 items-center justify-center
                  rounded-xl bg-amber-400/10 ring-1 ring-amber-400/25
                  group-hover:scale-105 transition-transform
                "
              >
                <Icon aria-hidden className="h-6 w-6 text-amber-300" />
              </span>

              <h5 className="font-medium leading-tight">{title}</h5>

              <p className="text-sm text-white/70 leading-snug">{desc}</p>
            </div>

            {/* Subtle amber halo on hover (decorative) */}
            <div
              className="
                pointer-events-none absolute inset-0 rounded-2xl opacity-0
                group-hover:opacity-100 transition-opacity
                [box-shadow:0_0_0_1px_rgba(251,191,36,0.20)_inset]
              "
              aria-hidden
            />
          </div>
        ))}
      </div>
    </section>
  );
}
