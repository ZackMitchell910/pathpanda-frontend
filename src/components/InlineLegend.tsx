"use client";
import React from "react";

type LegendItem = { label: string; swatch: string; dashed?: boolean };

export const InlineLegend: React.FC<{ items?: LegendItem[] }> = ({ items }) => {
  const safe: LegendItem[] =
    Array.isArray(items) && items.length
      ? items
      : [
          { label: "Median", swatch: "#60A5FA" },
          { label: "80% band", swatch: "linear-gradient(90deg, rgba(52,211,153,0.25), rgba(52,211,153,0.05))" },
          { label: "95% band", swatch: "linear-gradient(90deg, rgba(125,211,252,0.25), rgba(125,211,252,0.05))" },
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
          <span className="opacity-80">{it.label}</span>
        </div>
      ))}
    </div>
  );
};
