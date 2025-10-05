import React, { useId } from "react";

type Tab = { id: string; label: string; content: React.ReactNode; };
export const AccessibleTabs: React.FC<{
  tabs: Tab[]; activeId: string; onChange: (id: string)=>void;
}> = ({ tabs, activeId, onChange }) => {
  const tabsId = useId();
  return (
    <div>
      <div className="flex border-b border-[#1B2431] rounded-t-2xl overflow-hidden"
           role="tablist" aria-label="Results sections">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            id={`${tabsId}-tab-${t.id}`}
            role="tab"
            aria-selected={activeId === t.id}
            aria-controls={`${tabsId}-panel-${t.id}`}
            tabIndex={activeId === t.id ? 0 : -1}
            className={`px-4 py-2 ${activeId === t.id ? "bg-[#1F2937]" : "bg-[#131A23]"}`}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                const idx = tabs.findIndex(x => x.id === activeId);
                const next = e.key === "ArrowRight" ? (idx + 1) % tabs.length : (idx - 1 + tabs.length) % tabs.length;
                onChange(tabs[next].id);
              }
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tabs.map(t => (
        <div key={t.id}
             role="tabpanel"
             id={`${tabsId}-panel-${t.id}`}
             aria-labelledby={`${tabsId}-tab-${t.id}`}
             hidden={activeId !== t.id}
             className="p-4 bg-[#0E141C] rounded-b-2xl border border-[#1B2431] border-t-0">
          {t.content}
        </div>
      ))}
    </div>
  );
};
