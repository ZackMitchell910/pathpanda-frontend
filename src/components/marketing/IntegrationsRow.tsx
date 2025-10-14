// src/marketing/IntegrationsRow.tsx
import React from "react";
import {
  SiPolygon, SiRedis, SiDuckdb, SiFastapi, SiVercel,
  SiNumpy, SiPandas, SiPytorch, SiTensorflow, SiChartdotjs, SiQiskit,
  SiReact, SiPrometheus,
} from "react-icons/si";

type Item = {
  name: string;
  href: string;
  Icon?: React.ComponentType<{ className?: string }>;
  logoSrc?: string; // for local logos if needed
};
type Group = { title: string; items: Item[] };

function Chip({ item }: { item: Item }) {
  const { name, href, Icon, logoSrc } = item;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="relative rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:text-white
                 transition inline-flex items-center gap-2"
    >
      {/* white glow hover */}
      <span
        className="pointer-events-none absolute -inset-2 -z-10 opacity-0 hover:opacity-100 rounded-2xl transition"
        style={{ background: "radial-gradient(120px 120px at 50% 50%, rgba(255,255,255,0.22), transparent 60%)" }}
      />
      {Icon ? <Icon className="h-4 w-4" /> : logoSrc ? <img src={logoSrc} alt={name} className="h-4 w-4 object-contain" /> : null}
      <span>{name}</span>
    </a>
  );
}

export default function IntegrationsRow() {
  const groups: Group[] = [
    {
      title: "Market Data & Infra",
      items: [
        { name: "Polygon.io", href: "https://polygon.io", Icon: SiPolygon },
        { name: "Redis", href: "https://redis.io", Icon: SiRedis },
        { name: "DuckDB", href: "https://duckdb.org", Icon: SiDuckdb },
        { name: "FastAPI", href: "https://fastapi.tiangolo.com", Icon: SiFastapi },
        { name: "Vercel", href: "https://vercel.com", Icon: SiVercel },
        { name: "Prometheus Client", href: "https://prometheus.io/docs/instrumenting/clientlibs/", Icon: SiPrometheus },
      ],
    },
    {
      title: "ML & Quant",
      items: [
        { name: "NumPy", href: "https://numpy.org", Icon: SiNumpy },
        { name: "Pandas", href: "https://pandas.pydata.org", Icon: SiPandas },
        { name: "PyTorch", href: "https://pytorch.org", Icon: SiPytorch },
        { name: "TensorFlow", href: "https://tensorflow.org", Icon: SiTensorflow },
        { name: "Chart.js", href: "https://www.chartjs.org", Icon: SiChartdotjs },
        { name: "Qiskit", href: "https://qiskit.org", Icon: SiQiskit },
      ],
    },
    {
      title: "Frontend",
      items: [{ name: "React", href: "https://react.dev", Icon: SiReact }],
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {groups.map((g) => (
        <div key={g.title} className="space-y-4">
          <h3 className="text-white/70 text-sm uppercase tracking-wide">{g.title}</h3>
          {/* flowing, responsive chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {g.items.map((it) => <Chip key={it.name} item={it} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
