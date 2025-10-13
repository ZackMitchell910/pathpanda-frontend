// src/components/marketing/IntegrationsRow.tsx
import React from "react";
import {
  SiPolygon,
  SiRedis,
  SiDuckdb,
  SiTensorflow,
  SiFastapi,
  SiReact,
  SiPandas,
  SiPytorch,
  SiChartdotjs,
  SiVercel,
  SiNumpy,
  SiQiskit,
} from "react-icons/si";

type Item = {
  name: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  href: string;
};

type Group = { title: string; items: Item[] };

const groups: Group[] = [
  {
    title: "Market Data & Infra",
    items: [
      { name: "Polygon.io", Icon: SiPolygon, href: "https://polygon.io" },
      { name: "Vercel", Icon: SiVercel, href: "https://vercel.com" },
    ],
  },
  {
    title: "Data & Storage",
    items: [
      { name: "DuckDB", Icon: SiDuckdb, href: "https://duckdb.org" },
      { name: "Redis", Icon: SiRedis, href: "https://redis.io" },
    ],
  },
  {
    title: "Numerics & ML",
    items: [
      { name: "NumPy", Icon: SiNumpy, href: "https://numpy.org" },
      { name: "Pandas", Icon: SiPandas, href: "https://pandas.pydata.org" },
      { name: "PyTorch", Icon: SiPytorch, href: "https://pytorch.org" },
      { name: "TensorFlow", Icon: SiTensorflow, href: "https://www.tensorflow.org" },
    ],
  },
  {
    title: "Quantum Edge",
    items: [
      { name: "Qiskit", Icon: SiQiskit, href: "https://qiskit.org" },
      { name: "IBM Quantum Runtime", Icon: SiQiskit, href: "https://quantum-computing.ibm.com" },
    ],
  },
  {
    title: "API & UI",
    items: [
      { name: "FastAPI", Icon: SiFastapi, href: "https://fastapi.tiangolo.com" },
      { name: "React", Icon: SiReact, href: "https://react.dev" },
      { name: "Chart.js", Icon: SiChartdotjs, href: "https://www.chartjs.org" },
    ],
  },
];

function ItemChip({ item }: { item: Item }) {
  const { name, Icon, href } = item;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`${name} integration`}
      title={name}
      className={[
        "group relative inline-flex items-center gap-2 rounded-xl border px-3 py-2",
        "border-white/10 bg-white/5",
        "transition-[box-shadow,background-color,border-color] duration-200",
        "no-underline hover:no-underline focus:no-underline",           // ← kill underline
        "hover:bg-amber-400/10 hover:border-amber-400/40",             // ← amber tint
        "hover:ring-2 hover:ring-amber-400/40",                         // ← soft ring glow
        "hover:drop-shadow-[0_0_12px_rgba(245,158,11,0.35)]",           // ← glow behind
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60",
      ].join(" ")}
    >
      <Icon aria-hidden size={18} className="text-white/70 group-hover:text-amber-300 flex-shrink-0" />
      <span className="hidden sm:inline text-sm text-white/80 group-hover:text-amber-200 truncate max-w-[140px]">
        {name}
      </span>
    </a>
  );
}


export default function IntegrationsRow() {
  return (
    <section className="integrations max-w-6xl mx-auto px-4 py-16 border-t border-white/10">
      <h4 className="text-center text-[11px] tracking-[0.2em] text-white/60 mb-6">
        POWERED BY LEADING TECHNOLOGIES
      </h4>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {groups.map((g) => (
          <div key={g.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 text-xs font-semibold text-white/70 uppercase tracking-wide">{g.title}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {g.items.map((it) => (
                <ItemChip key={it.name} item={it} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
