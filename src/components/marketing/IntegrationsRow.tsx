"use client";

const items = [
  { name: "Polygon" },
  { name: "DuckDB" },
  { name: "Redis" },
  { name: "TensorFlow" },
  { name: "FastAPI" },
  { name: "React" },
];

export default function IntegrationsRow() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center text-white/70 text-sm tracking-widest">
        INTEGRATIONS & STACK
      </div>

      <div className="mt-6 grid grid-cols-3 md:grid-cols-6 gap-4">
        {items.map((it) => (
          <div
            key={it.name}
            className="h-12 rounded-lg border border-[#1B2431] bg-[#0E1420]/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:border-white/30 transition"
          >
            {it.name}
          </div>
        ))}
      </div>
    </section>
  );
}
