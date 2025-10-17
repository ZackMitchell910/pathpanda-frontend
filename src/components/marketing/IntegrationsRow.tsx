// src/marketing/IntegrationsRow.tsx
import React from "react";
import {
  SiPolygon, SiRedis, SiDuckdb, SiFastapi, SiVercel,
  SiNumpy, SiPandas, SiScikitlearn, SiScipy, SiPytorch, SiTensorflow, SiOnnx, SiChartdotjs, SiQiskit,
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
      className="relative inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:text-white"
    >
      {/* white glow hover */}
      <span
        className="pointer-events-none absolute -inset-2 -z-10 rounded-2xl opacity-0 transition duration-200 hover:opacity-100"
        style={{
          background:
            "radial-gradient(120px 120px at 50% 50%, rgba(255,255,255,0.22), transparent 60%)",
        }}
      />
      {Icon ? (
        <Icon className="h-4 w-4" aria-hidden="true" />
      ) : logoSrc ? (
        <img src={logoSrc} alt={name} className="h-4 w-4 object-contain opacity-80" />
      ) : null}
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
        { name: "PyArrow", href: "https://arrow.apache.org", logoSrc: "/logos/pyarrow.svg" },
        { name: "DuckDB", href: "https://duckdb.org", Icon: SiDuckdb },
        { name: "Redis", href: "https://redis.io", Icon: SiRedis },
        { name: "Prometheus", href: "https://prometheus.io", Icon: SiPrometheus },
      ],
    },
    {
      title: "Platform & Delivery",
      items: [
        { name: "FastAPI", href: "https://fastapi.tiangolo.com", Icon: SiFastapi },
        { name: "Uvicorn", href: "https://www.uvicorn.org", logoSrc: "/logos/uvicorn.svg" },
        { name: "Vercel", href: "https://vercel.com", Icon: SiVercel },
        { name: "React", href: "https://react.dev", Icon: SiReact },
        { name: "Chart.js", href: "https://www.chartjs.org", Icon: SiChartdotjs },
      ],
    },
    {
      title: "Data Science",
      items: [
        { name: "NumPy", href: "https://numpy.org", Icon: SiNumpy },
        { name: "Pandas", href: "https://pandas.pydata.org", Icon: SiPandas },
        { name: "SciPy", href: "https://scipy.org", Icon: SiScipy },
        { name: "scikit-learn", href: "https://scikit-learn.org", Icon: SiScikitlearn },
        { name: "ONNX Runtime", href: "https://onnxruntime.ai", Icon: SiOnnx },
      ],
    },
    {
      title: "AI & Advanced",
      items: [
        { name: "PyTorch", href: "https://pytorch.org", Icon: SiPytorch },
        { name: "TensorFlow", href: "https://tensorflow.org", Icon: SiTensorflow },
        { name: "Qiskit", href: "https://qiskit.org", Icon: SiQiskit },
        { name: "xAI", href: "https://x.ai", logoSrc: "/logos/xai.svg" },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
      {groups.map((g) => (
        <div key={g.title} className="space-y-4">
          <h3 className="text-white/70 text-sm uppercase tracking-wide">{g.title}</h3>
          {/* flowing, responsive chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {g.items.map((it) => (
              <Chip key={it.name} item={it} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
