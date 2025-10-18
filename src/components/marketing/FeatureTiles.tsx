import React from "react";
import { LineChart, BrainCircuit, BarChart3, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const features: Array<{ title: string; desc: string; Icon: LucideIcon }> = [
  { title: "Autonomous Simulation Framework", desc: "Scalable Simetrix Quant Engine (SQE) simulations with cohort analysis and real-time reconciliation.", Icon: LineChart },
  { title: "Adaptive Learning Engine", desc: "Incremental model refinement via dynamic labeling on streaming data inputs.", Icon: BrainCircuit },
  { title: "Attribution Analytics", desc: "Factor-based explainability across regimes and probabilistic scenarios.", Icon: BarChart3 },
  { title: "Strategic Signal Generation", desc: "Algorithmic candidate selection, ranking, and narrative-driven insights.", Icon: Sparkles },
];

export default function FeatureTiles() {
  return (
    <section className="max-w-6xl mx-auto px-4 pt-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {features.map(({ title, desc, Icon }) => (
          <div
            key={title}
            tabIndex={0}
            className="
              group relative rounded-2xl border border-white/10
              bg-white/[0.04] supports-[backdrop-filter]:bg-white/5 supports-[backdrop-filter]:backdrop-blur
              hover:bg-white/[0.06] hover:border-blue-300/20
              transition-colors p-5 h-full
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-300/35
            "
          >
            {/* Centered stack */}
            <div className="flex flex-col items-center justify-center text-center gap-3 min-h-[180px] h-full">
              <span
                className="
                  inline-flex h-12 w-12 items-center justify-center
                  rounded-xl bg-blue-400/10 ring-1 ring-blue-400/20 
                  motion-safe:group-hover:scale-105 transition-transform
                "
                aria-hidden
              >
                <Icon className="h-6 w-6 text-blue-300" />
              </span>

              <h5 className="font-medium leading-tight">{title}</h5>
              <p className="text-sm text-white/70 leading-snug">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

