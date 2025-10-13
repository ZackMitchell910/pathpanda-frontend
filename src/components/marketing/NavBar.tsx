// NavBar.tsx — logo + SIMETRIX, amber hover, no underlines anywhere
"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LogoSimetrix from "@/components/branding/LogoSimetrix";

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
        {/* Brand: logo + SIMETRIX, never underlined */}
        <a
          href="/"
          className="flex items-center gap-2 no-underline hover:no-underline focus-visible:no-underline active:no-underline"
          aria-label="Simetrix Home"
          style={{ textDecoration: "none" }}
        >
          <LogoSimetrix size={28} />
          <span className="font-semibold tracking-wide text-white/90">SIMETRIX</span>
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
                <button
                  className={[
                    "transition-colors no-underline hover:no-underline focus-visible:no-underline",
                    productOpen
                      ? "text-amber-400"
                      : "text-white/80 hover:text-amber-400 focus-visible:text-amber-400",
                  ].join(" ")}
                  aria-expanded={productOpen}
                  aria-haspopup="menu"
                >
                  {l.label}
                </button>
                <AnimatePresence>
                  {productOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 mt-2 w-72 rounded-xl border border-white/10 bg-black/90 shadow-2xl p-2 backdrop-blur"
                      role="menu"
                    >
                      <a
                        href="/app"
                        className="block rounded-lg px-3 py-2 transition-colors hover:bg-amber-400/5 hover:text-amber-400 no-underline hover:no-underline focus-visible:no-underline"
                        role="menuitem"
                        style={{ textDecoration: "none" }}
                      >
                        <div className="text-sm font-medium">SIMETRIX</div>
                        <div className="text-xs text-white/60">
                          Simulations • Accuracy • Cohorts
                        </div>
                      </a>
                      <a
                        href="#product"
                        className="mt-1 block rounded-lg px-3 py-2 text-xs text-white/60 transition-colors hover:bg-amber-400/5 hover:text-amber-400 no-underline hover:no-underline focus-visible:no-underline"
                        role="menuitem"
                        style={{ textDecoration: "none" }}
                      >
                        Learn more
                      </a>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <a
                key={l.label}
                href={l.href}
                className="text-white/80 transition-colors hover:text-amber-400 focus-visible:text-amber-400 no-underline hover:no-underline focus-visible:no-underline active:no-underline"
                style={{ textDecoration: "none" }}
              >
                {l.label}
              </a>
            )
          )}

          <a
            href="/app"
            className="rounded-lg px-3 py-2 border border-white/20 text-white/90 transition-colors hover:text-amber-400 hover:border-amber-400 hover:bg-amber-400/5 no-underline hover:no-underline focus-visible:no-underline"
            style={{ textDecoration: "none" }}
          >
            Run Simulation
          </a>
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((s) => !s)}
          className="md:hidden rounded-lg px-3 py-2 border border-white/20 text-white/80 transition-colors hover:text-amber-400 hover:border-amber-400 no-underline hover:no-underline focus-visible:no-underline"
          aria-expanded={open}
          aria-label="Toggle menu"
          style={{ textDecoration: "none" }}
        >
          Menu
        </button>
      </div>

      {/* Mobile menu */}
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
                <a
                  href="/app"
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 transition-colors hover:bg-amber-400/5 hover:text-amber-400 no-underline hover:no-underline focus-visible:no-underline"
                  style={{ textDecoration: "none" }}
                >
                  SIMETRIX
                </a>
                <a
                  href="#product"
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 text-sm text-white/60 transition-colors hover:bg-amber-400/5 hover:text-amber-400 no-underline hover:no-underline focus-visible:no-underline"
                  style={{ textDecoration: "none" }}
                >
                  Learn more
                </a>
              </div>

              <a
                href="/docs"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 transition-colors hover:bg-amber-400/5 hover:text-amber-400 no-underline hover:no-underline focus-visible:no-underline"
                style={{ textDecoration: "none" }}
              >
                Docs
              </a>
              <a
                href="#pricing"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 transition-colors hover:bg-amber-400/5 hover:text-amber-400 no-underline hover:no-underline focus-visible:no-underline"
                style={{ textDecoration: "none" }}
              >
                Pricing
              </a>
              <a
                href="#contact"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 transition-colors hover:bg-amber-400/5 hover:text-amber-400 no-underline hover:no-underline focus-visible:no-underline"
                style={{ textDecoration: "none" }}
              >
                Contact
              </a>

              <a
                href="/app"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-lg px-3 py-2 border border-white/20 text-center transition-colors hover:text-amber-400 hover:border-amber-400 hover:bg-amber-400/5 no-underline hover:no-underline focus-visible:no-underline"
                style={{ textDecoration: "none" }}
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
