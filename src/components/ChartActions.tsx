// src/components/ChartActions.tsx
import React from "react";

export const ChartActions: React.FC<{
  onExport: () => void;
  onShare: () => void;
}> = ({ onExport, onShare }) => {
  return (
    <div className="flex items-center gap-2 mt-2">
      <button
        onClick={onExport}
        className="px-3 py-1.5 rounded-xl bg-[#27272A] border border-[#3F3F46] hover:bg-[#303036]"
        aria-label="Export chart as image"
      >
        Export
      </button>
      <button
        onClick={onShare}
        className="px-3 py-1.5 rounded-xl bg-[#27272A] border border-[#3F3F46] hover:bg-[#303036]"
        aria-label="Copy share link"
      >
        Share
      </button>
    </div>
  );
};

export default ChartActions;

