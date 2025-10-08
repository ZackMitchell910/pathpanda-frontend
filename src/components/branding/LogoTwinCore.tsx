"use client";
import { motion } from "framer-motion";

export default function LogoTwinCore({ size = 28, glow = true }: { size?: number; glow?: boolean }) {
  const s = size;
  return (
    <div className="relative" style={{ width: s, height: s }}>
      {glow && (
        <div
          className="absolute inset-0 rounded-full blur-[8px]"
          style={{ background: "radial-gradient(circle, rgba(52,211,153,0.35), transparent 60%)" }}
        />
      )}
      <svg width={s} height={s} viewBox="0 0 64 64" className="relative">
        {/* Outer orbit */}
        <motion.circle
          cx="32" cy="32" r="22"
          stroke="rgba(125,211,252,0.8)" strokeWidth="1.2" fill="none"
          initial={{ rotate: 0 }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 26, ease: "linear" }}
          style={{ originX: "32px", originY: "32px" }}
        />
        {/* Inner orbit */}
        <motion.circle
          cx="32" cy="32" r="14"
          stroke="rgba(52,211,153,0.9)" strokeWidth="1.2" fill="none"
          initial={{ rotate: 0 }} animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
          style={{ originX: "32px", originY: "32px" }}
        />
        {/* Twin cores */}
        <circle cx="24" cy="32" r="4" fill="#34D399" />
        <circle cx="40" cy="32" r="4" fill="#7DD3FC" />
      </svg>
    </div>
  );
}
