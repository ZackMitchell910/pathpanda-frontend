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

// Custom xAI Icon (assuming imported SVG for precision; adjust path accordingly)
import XaiLogo from '@/assets/xai-logo.svg';

const XaiIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <img src={XaiLogo} alt="xAI" width={size} height={size} className={className} />
);

type Item = {
  name: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  href: string;
};

type Group = { title: string; items: Item[] };

const groups: Group[] = [
  {
    title: "Data & Infrastructure",
    items: [
      { name: "Polygon.io", Icon: SiPolygon, href: "https://polygon.io" },
      { name: "Vercel", Icon: SiVercel, href: "https://vercel.com" },
    ],
  },
  {
    title: "Storage Engines",
    items: [
      { name: "DuckDB", Icon: SiDuckdb, href: "https://duckdb.org" },
      { name: "Redis", Icon: SiRedis, href: "https://redis.io" },
    ],
  },
  {
    title: "Numerics & AI",
    items: [
      { name: "NumPy", Icon: SiNumpy, href: "https://numpy.org" },
      { name: "Pandas", Icon: SiPandas, href: "https://pandas.pydata.org" },
      { name: "PyTorch", Icon: SiPytorch, href: "https://pytorch.org" },
      { name: "TensorFlow", Icon: SiTensorflow, href: "https://www.tensorflow.org" },
      { name: "xAI", Icon: XaiIcon, href: "https://x.ai" },
    ],
  },
  {
    title: "API & Frontend",
    items: [
      { name: "FastAPI", Icon: SiFastapi, href: "https://fastapi.tiangolo.com" },
      { name: "React", Icon: SiReact, href: "https://react.dev" },
      { name: "Chart.js", Icon: SiChartdotjs, href: "https://www.chartjs.org" },
    ],
  },
  {
    title: "Quantum Tools",
    items: [
      { name: "Qiskit", Icon: SiQiskit, href: "https://qiskit.org" },
      { name: "IBM Quantum Runtime", Icon: SiQiskit, href: "https://quantum-computing.ibm.com" },
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
        "group relative inline-flex items-center gap-2 rounded-full border px-4 py-2.5",
        "border-white/5 bg-white/3 backdrop-blur-sm",
        "transition-all duration-300 ease-in-out",
        "no-underline hover:no-underline focus:no-underline",
        "hover:bg-amber-400/5 hover:border-amber-400/30 hover:scale-105",
        "hover:shadow-[0_0_15px_rgba(251,191,36,0.15)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
      ].join(" ")}
    >
      <Icon aria-hidden size={20} className="text-white/60 group-hover:text-amber-300 flex-shrink-0 transition-colors" />
      <span className="text-sm font-medium text-white/70 group-hover:text-amber-200 truncate max-w-[160px]">
        {name}
      </span>
    </a>
  );
}

export default function IntegrationsRow() {
  return (
    <section className="integrations max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
      <h4 className="text-center text-xs tracking-[0.25em] text-white/50 mb-10 font-semibold uppercase">
        EMPOWERED BY PREMIER TECHNOLOGIES
      </h4>
      <div className="flex flex-wrap justify-center gap-8 lg:gap-10">
        {groups.map((g) => (
          <div 
            key={g.title} 
            className="flex flex-col items-center w-full sm:w-auto min-w-[280px] max-w-sm rounded-xl bg-white/2 backdrop-blur-md p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-300 hover:shadow-[0_6px_25px_rgba(251,191,36,0.1)]"
          >
            <div className="mb-5 text-sm font-semibold text-white/60 uppercase tracking-wider text-center">{g.title}</div>
            <div className="flex flex-wrap gap-3 justify-center">
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