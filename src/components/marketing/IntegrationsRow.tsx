import React from "react";
import {
  SiPolygon,
  SiRedis,
  SiDuckdb,
  SiTensorflow,
  SiFastapi,
  SiReact,
} from "react-icons/si";

const items = [
  { name: "Polygon", Icon: SiPolygon, href: "https://polygon.technology" },
  { name: "Redis", Icon: SiRedis, href: "https://redis.io" },
  { name: "DuckDB", Icon: SiDuckdb, href: "https://duckdb.org" },
  { name: "TensorFlow", Icon: SiTensorflow, href: "https://www.tensorflow.org" },
  { name: "FastAPI", Icon: SiFastapi, href: "https://fastapi.tiangolo.com" },
  { name: "React", Icon: SiReact, href: "https://react.dev" },
];

export default function IntegrationsRow() {
  return (
    <section className="max-w-6xl mx-auto px-4 pt-10 pb-4">
      <h4 className="text-center text-[11px] tracking-[0.2em] text-white/60">
        INTEGRATIONS &amp; STACK
      </h4>
      <ul className="mt-4 flex flex-wrap items-center justify-center gap-2 md:gap-3">
        {items.map(({ name, Icon, href }) => (
          <li key={name}>
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={name}
              title={name}
              className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:border-white/25 hover:bg-white/10 transition"
            >
              <Icon
                aria-hidden
                size={18}
                className="text-white/70 group-hover:text-white"
              />
              <span className="hidden sm:inline text-sm text-white/70 group-hover:text-white">
                {name}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
