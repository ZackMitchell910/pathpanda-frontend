import React from "react";
import NavBar from "@/components/marketing/NavBar";
import Footer from "@/components/marketing/Footer";
import { ProductsSection } from "@/landing/Landing";

export default function ProductsPage() {
  return (
    <div className="relative min-h-screen bg-black text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.25]"
        style={{
          background:
            "radial-gradient(60% 35% at 50% 0%, rgba(148,163,184,0.12) 0%, rgba(15,23,42,0.25) 60%)",
        }}
      />

      <NavBar />

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-24 md:px-8 md:pt-32">
        <section className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            Platforms
          </span>
          <h1 className="mt-4 font-brand text-3xl leading-tight md:text-5xl md:leading-tight">
            Choose the right Simetrix workspace for your desk.
          </h1>
          <p className="mt-4 text-white/65 md:text-lg">
            Simulate markets, run autonomous traders, or explore upcoming tooling—all from one control plane.
          </p>
        </section>

        <ProductsSection />

        <section className="mx-auto mt-16 max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 md:p-8">
          <h2 className="text-lg font-semibold text-white">Need a tailored deployment?</h2>
          <p className="mt-2">
            Contact <a href="mailto:info@simetrix.io" className="text-white underline-offset-4 hover:underline">info@simetrix.io</a> to discuss custom datasets,
            on-prem workloads, or integrations with your existing execution stack.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
