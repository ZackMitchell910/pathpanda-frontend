import React from "react";
import { LineChart, BrainCircuit, BarChart3, Users } from "lucide-react";

const features = [
  {
    title: "Autonomous Forecasting Engine",
    desc: "Unattended runs with cohort logging and settlement.",
    Icon: LineChart,
  },
  {
    title: "Self-Learning AI",
    desc: "Online updates as new data arrives; improves over time.",
    Icon: BrainCircuit,
  },
  {
    title: "Explainability & Drivers",
    desc: "Attribution to factors, regimes, and scenarios.",
    Icon: BarChart3,
  },
  {
    title: "Built for Analysts • Traders • Institutions",
    desc: "Pro workflows, fast UI, API access.",
    Icon: Users,
  },
];

export default function FeatureTiles() {
  return (
    <section className="max-w-6xl mx-auto px-4 pt-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {features.map(({ title, desc, Icon }) => (
          <div
            key={title}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-white/20 transition"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                <Icon aria-hidden className="h-5 w-5 text-white/80" />
              </span>
              <h5 className="font-medium">{title}</h5>
            </div>
            <p className="mt-2 text-sm text-white/70">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
