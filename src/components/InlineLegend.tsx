
// ==========================
// File: src/components/InlineLegend.tsx
// ==========================
"use client";
import React from "react";

type LegendItem = { label: string; swatch: string; dashed?: boolean };

export const InlineLegend: React.FC<{ items?: LegendItem[] }> = ({ items }) => {
  const safe: LegendItem[] = Array.isArray(items) && items.length
    ? items
    : [
        { label: "Median", swatch: "#F3F4F6" }, // neutral light
        {
          label: "80% band",
          swatch:
            "linear-gradient(90deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))",
        },
        {
          label: "95% band",
          swatch:
            "linear-gradient(90deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))",
        },
      ];

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs">
      {safe.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-5 rounded"
            style={{
              background: it.swatch,
              border: it.dashed ? "1px dashed rgba(148,163,184,0.6)" : "none",
            }}
            aria-hidden
          />
          <span className="text-white/80">{it.label}</span>
        </div>
      ))}
    </div>
  );
};
