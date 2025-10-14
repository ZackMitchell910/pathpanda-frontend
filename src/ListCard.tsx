// ==========================
// File: src/components/ListCard.tsx
// Palantir-neutral container card with sticky header optional
// ==========================
import * as React from "react";

export default function ListCard({
  title,
  subtitle,
  right,
  maxHeight = 360,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  maxHeight?: number | string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
      <header className="px-4 py-2 border-b border-white/10 bg-black/60 sticky top-0 z-10 flex items-center justify-between">
        <div className="text-sm font-semibold">
          {title}
          {subtitle && <span className="text-white/50 font-normal ms-2">{subtitle}</span>}
        </div>
        {right || null}
      </header>
      <div className="overflow-y-auto thin-scroll" style={{ maxHeight }}>
        {children}
      </div>
    </section>
  );
}
