// NavBar.tsx — monochrome, zero overflow
"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LogoTwinCore from "@/components/branding/LogoTwinCore";

const links = [
  { href: "#product", label: "Product", hasMenu: true },
  { href: "/docs", label: "Docs" },
  { href: "#pricing", label: "Pricing" },
  { href: "#contact", label: "Contact" },
];

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);

  return (
    <header className="navbar sticky top-0 z-40">
      <div className="container h-14 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <LogoTwinCore className="h-6 w-6" />
          <span className="font-semibold tracking-wide">SIMETRIX</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) =>
            l.hasMenu ? (
              <div
                key={l.label}
                className="relative"
                onMouseEnter={() => setProductOpen(true)}
                onMouseLeave={() => setProductOpen(false)}
              >
                <button className="text-white/80 hover:text-white">{l.label}</button>
                <AnimatePresence>
                  {productOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 mt-2 w-72 rounded-xl border border-white/10 bg-black/90 shadow-2xl p-2"
                    >
                      <a href="/app" className="block rounded-lg px-3 py-2 hover:bg-white/5">
                        <div className="text-sm font-medium">SIMETRIX</div>
                        <div className="text-xs text-white/60">Simulations • Accuracy • Cohorts</div>
                      </a>
                      <a href="#product" className="mt-1 block rounded-lg px-3 py-2 hover:bg-white/5 text-xs text-white/60">
                        Learn more
                      </a>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <a key={l.label} href={l.href} className="text-white/80 hover:text-white">
                {l.label}
              </a>
            )
          )}
          <a
            href="/app"
            className="rounded-lg px-3 py-2 border border-white/20 hover:bg-white/5 transition"
          >
            Run Simulation
          </a>
        </nav>

        {/* Mobile toggle (monochrome) */}
        <button
          onClick={() => setOpen((s) => !s)}
          className="md:hidden rounded-lg px-3 py-2 border border-white/20 text-white/80"
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          Menu
        </button>
      </div>

      {/* Mobile menu — ensure no horizontal overflow */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="md:hidden border-t border-white/10 bg-black/95"
          >
            <div className="container py-3 flex flex-col gap-2">
              <div className="rounded-lg border border-white/12">
                <div className="px-3 py-2 text-white/80">Product</div>
                <a href="/app" onClick={() => setOpen(false)} className="block px-3 py-2 hover:bg-white/5">
                  SIMETRIX
                </a>
                <a href="#product" onClick={() => setOpen(false)} className="block px-3 py-2 hover:bg-white/5 text-sm text-white/60">
                  Learn more
                </a>
              </div>

              <a href="/docs" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-white/5">
                Docs
              </a>
              <a href="#pricing" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-white/5">
                Pricing
              </a>
              <a href="#contact" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-white/5">
                Contact
              </a>

              <a
                href="/app"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-lg px-3 py-2 border border-white/20 text-center hover:bg-white/5 transition"
              >
                Run Simulation
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
