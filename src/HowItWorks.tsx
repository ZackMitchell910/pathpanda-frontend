// src/HowItWorks.tsx (page wrapper)
import React from "react";
import NavBar from "@/components/marketing/NavBar";
import Footer from "@/components/marketing/Footer";
import HowItWorksSection from "@/components/marketing/HowItWorksSection";
import { Button } from "@/components/ui/button";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <NavBar />

      <main className="flex-1">
        {/* Full narrative section */}
        <section className="mx-auto max-w-7xl px-6 md:px-8 pb-12">
          <HowItWorksSection />
        </section>
        {/* Page CTA (white aura, no amber) */}
        <section className="mx-auto max-w-7xl px-6 md:px-8 pb-16">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:flex md:items-center md:justify-between">
            <div>
              <div className="text-lg font-semibold">Ready to try it live?</div>
              <div className="text-white/70 text-sm">Run a simulation or open the dashboard.</div>
            </div>
            <div className="mt-4 md:mt-0 flex gap-3">
              <div className="relative group">
                <span
                  className="pointer-events-none absolute -inset-2 -z-10 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: "radial-gradient(120px 120px at 50% 50%, rgba(255,255,255,0.18), transparent 60%)" }}
                />
                <Button asChild className="rounded-xl bg-white text-black hover:bg-white/90 px-5 py-5">
                  <a href="/app">Open Dashboard</a>
                </Button>
              </div>

              <div className="relative group">
                <span
                  className="pointer-events-none absolute -inset-2 -z-10 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: "radial-gradient(120px 120px at 50% 50%, rgba(255,255,255,0.18), transparent 60%)" }}
                />
                <Button
                  asChild
                  variant="outline"
                  className="rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10 px-5 py-5"
                >
                  <a href="/#pricing">See Pricing</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

