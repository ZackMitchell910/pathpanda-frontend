// BackgroundOrbs.tsx — grayscale atmospherics, no color
export default function BackgroundOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Soft white bloom top-right */}
      <div
        className="absolute right-[-12%] top-[-12%] h-[420px] w-[420px] rounded-full blur-[140px]"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.14), transparent 65%)" }}
      />
      {/* Subtle bloom left */}
      <div
        className="absolute left-[-10%] top-[22%] h-[360px] w-[360px] rounded-full blur-[130px]"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.10), transparent 60%)" }}
      />
      {/* Vertical grayscale wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 400px at 10% 20%, rgba(255,255,255,0.06), transparent 60%)"
        }}
      />
    </div>
  );
}
