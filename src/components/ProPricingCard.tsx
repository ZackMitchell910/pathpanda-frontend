//import React from "react";
//import { Check } from "lucide-react";

//export default function ProPricingCard({
  checkoutUrl = "#pro-checkout",
}: {
  checkoutUrl?: string;
}) {
  return (
    <section className="relative rounded-2xl border border-white/10 bg-[#0f1216]/70 p-6 md:p-7 shadow-[0_0_40px_rgba(16,185,129,0.08)]">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-sm tracking-wide uppercase text-white/75">Pro</span>
        <span className="rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] px-2 py-0.5 border border-emerald-400/30">
          BETA
        </span>
      </div>

      {/* Price row */}
      <div className="mt-3 flex items-end gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-white">$0</span>
          <span className="text-white/70">.00</span>
          <span className="text-xs text-white/50">/mo</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="line-through text-white/40">$39.00</span>
          <span className="text-[11px] text-emerald-300/90 bg-emerald-500/10 border border-emerald-400/30 rounded px-1.5 py-0.5">
            during beta
          </span>
        </div>
      </div>

      <p className="mt-2 text-sm text-white/70">
        Unlimited QuickSims, DeepSim access, drivers & targets. Pricing locks in after beta.
      </p>

      {/* CTA */}
      <a
        href={checkoutUrl}
        className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-emerald-400 text-[#0A111A] font-semibold px-4 py-2.5 hover:brightness-110 transition focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
        aria-label="Start Pro (Beta $0.00)"
      >
        Start Pro — $0.00
      </a>

      {/* Feature list */}
      <ul className="mt-5 space-y-2 text-sm">
        {[
          "Deep Sim up to 10y",
          "Fan chart, targets, hit-probability",
          "Daily Quant pick + finalists",
          "Export summary & artifacts",
        ].map((f) => (
          <li key={f} className="flex items-center gap-2 text-white/80">
            <Check className="w-4 h-4 text-emerald-300" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* Subfoot note */}
      <p className="mt-4 text-xs text-white/50">
        Beta pricing subject to change; your plan stays at launch rate after GA.
      </p>

      {/* subtle glow accent */}
      <div className="pointer-events-none absolute -inset-px rounded-2xl ring-1 ring-emerald-400/20" />
    </section>
  );
}