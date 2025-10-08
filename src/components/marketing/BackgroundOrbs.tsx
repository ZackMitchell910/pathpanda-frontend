export default function BackgroundOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      {/* Emerald glow top-right */}
      <div className="absolute right-[-10%] top-[-10%] h-[420px] w-[420px] rounded-full blur-[120px]"
           style={{ background: "radial-gradient(circle, rgba(52,211,153,0.22), transparent 60%)" }} />
      {/* Cyan glow left */}
      <div className="absolute left-[-8%] top-[20%] h-[360px] w-[360px] rounded-full blur-[110px]"
           style={{ background: "radial-gradient(circle, rgba(125,211,252,0.18), transparent 60%)" }} />
      {/* Vertical gradient wash */}
      <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_70%_-10%,rgba(52,211,153,0.14),transparent_60%),radial-gradient(800px_400px_at_10%_20%,rgba(125,211,252,0.12),transparent_60%)]" />
    </div>
  );
}
