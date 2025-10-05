// src/components/InfoTooltip.tsx
import React from "react";

export const InfoTooltip: React.FC<{ label: string }> = ({ label }) => (
  <span
    className="inline-flex items-center justify-center w-4 h-4 text-xs rounded-full bg-[#1B2431] text-gray-300 cursor-help"
    title={label}
    aria-label={label}
  >
    i
  </span>
);

export default InfoTooltip;
